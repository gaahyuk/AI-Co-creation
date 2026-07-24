// 매칭엔진 — 자격판정(eligibility) 결과 위에서 동작하는 스코어링/랭킹 레이어.
//
// 원본(이윤호 브랜치)의 matching-engine.ts(티어/사유 판정)와
// /api/recommendations/personalized(점수 계산) 로직을 베이스 아키텍처에 맞게 포팅했다.
// - 자격 판정 자체는 베이스의 evaluateEligibility(checks)가 이미 수행하므로 중복 구현하지 않고,
//   그 결과물인 PolicyWithEligibility를 입력으로 받아 매칭도 점수(0~100)와 추천 사유를 계산한다.
// - 서버/DB 없이 순수 함수로만 구성 → 클라이언트에서 그대로 스코어링 가능.

import type { PolicyWithEligibility, UserProfile } from "@/lib/youth/types";
import { normalizeCategory, sidoNameByCode, JOB_STATUSES } from "@/lib/regions";
import { formatManwon } from "@/lib/format";

/** 매칭 티어 — full: 모든 조건 확인·충족 / partial: 일부 조건 확인 불가 / excluded: 명확히 부적격 */
export type MatchTier = "full" | "partial" | "excluded";

/** 매칭엔진 입력 (프로필 + 자가진단 관심분야 + 북마크) */
export interface MatchInput {
  profile: UserProfile | null;
  /** 자가진단(youth.diagnosis)에서 추출한 관심 분야 (표준 5분류명) */
  diagnosisInterests?: string[];
  /** 이미 저장(북마크)한 정책 ID — 이미 알고 있는 정책은 추천 순위를 낮춘다 */
  bookmarkIds?: string[];
}

/** 정책 1건에 대한 스코어링 결과 */
export interface ScoredPolicy {
  policy: PolicyWithEligibility;
  /** 매칭도 (0~100) */
  score: number;
  tier: MatchTier;
  /** 추천 사유 목록 (excluded면 빈 배열) */
  reasons: string[];
}

/** 항목별 배점 (합계 최대 100) */
export const SCORE = {
  /** 연령 제한이 있고 내 나이가 범위 안 */
  AGE_MATCH: 20,
  /** 연령 제한이 아예 없는 정책 */
  AGE_NO_LIMIT: 10,
  /** 거주지 조건 충족(전국 포함) */
  REGION_MATCH: 15,
  /** 취업상태 조건 충족(제한 없음 포함) */
  JOB_MATCH: 15,
  /** 소득 조건이 없는 정책 */
  INCOME_FREE: 10,
  /** 관심 분야(프로필/자가진단)와 카테고리 일치 */
  INTEREST_MATCH: 20,
  /** 지원금이 확인되고 100만원 이상 */
  HIGH_AMOUNT: 10,
  /** 마감 임박 (D-14 이내) */
  DEADLINE_SOON: 10,
  /** 이미 북마크한 정책 감점 */
  BOOKMARK_PENALTY: -30,
} as const;

/** 생년월일 기준 만 나이 계산 (원본 calculateAge 포팅) */
export function calculateAge(birthDate: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    at.getMonth() > birthDate.getMonth() ||
    (at.getMonth() === birthDate.getMonth() && at.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * 자가진단 결과(youth.diagnosis)에서 관심 분야를 방어적으로 추출한다.
 * 자가진단은 다른 기능이 저장하는 값이라 필드 구조를 보장할 수 없으므로,
 * 알려진 후보 필드에서 문자열 배열만 골라 표준 5분류명으로 정규화한다.
 */
export function extractDiagnosisInterests(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const candidateKeys = ["interests", "categories", "recommendedCategories", "interestCategories"];
  const found: string[] = [];
  for (const key of candidateKeys) {
    const value = obj[key];
    if (Array.isArray(value)) {
      for (const item of value) if (typeof item === "string") found.push(item);
    }
  }
  return [...new Set(found.map((s) => normalizeCategory(s)).filter((c) => c !== "기타"))];
}

// 베이스 eligibility.ts가 "제한 없음"일 때 넣는 detail 문자열 (배점 구분용)
const AGE_NO_LIMIT_DETAIL = "연령 제한 없음";
const REGION_NO_LIMIT_DETAIL = "전국";
const JOB_NO_LIMIT_DETAIL = "제한 없음";

/** 프로필의 취업상태 코드 → 이름 (사유 문구용) */
function jobName(code?: string): string | null {
  if (!code) return null;
  return JOB_STATUSES.find((j) => j.code === code)?.name ?? null;
}

/**
 * 정책 1건의 매칭도 점수·티어·추천 사유 계산.
 * 원본의 evaluateMatch(티어/사유)와 추천 API의 배점 로직을 합쳐 포팅했다.
 */
export function scorePolicy(policy: PolicyWithEligibility, input: MatchInput): ScoredPolicy {
  // 명확히 부적격(체크 하나라도 ✕)이거나 마감된 정책은 제외 — 원본 excluded 티어처럼 사유 없이 반환
  if (!policy.eligible || policy.checks.some((c) => c.passed === false)) {
    return { policy, score: 0, tier: "excluded", reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];
  let uncertain = false; // 확인 불가 항목(passed === null) 존재 여부

  for (const check of policy.checks) {
    switch (check.label) {
      case "연령":
        if (check.passed === true) {
          if (check.detail === AGE_NO_LIMIT_DETAIL) {
            score += SCORE.AGE_NO_LIMIT;
          } else {
            score += SCORE.AGE_MATCH;
            reasons.push(
              input.profile?.age !== undefined
                ? `나이 조건 충족 (만 ${input.profile.age}세)`
                : "나이 조건 충족",
            );
          }
        } else {
          uncertain = true;
        }
        break;
      case "거주지":
        if (check.passed === true) {
          score += SCORE.REGION_MATCH;
          if (check.detail !== REGION_NO_LIMIT_DETAIL) {
            const regionCode = input.profile?.regionCode ?? input.profile?.sidoCode;
            const name = regionCode ? sidoNameByCode(regionCode) : "";
            reasons.push(name ? `지역 조건 충족 (${name})` : "지역 조건 충족");
          }
        } else {
          uncertain = true;
        }
        break;
      case "취업상태":
        if (check.passed === true) {
          score += SCORE.JOB_MATCH;
          if (check.detail !== JOB_NO_LIMIT_DETAIL) {
            const name = jobName(input.profile?.jobCode);
            reasons.push(name ? `취업상태 조건 충족 (${name})` : "취업상태 조건 충족");
          }
        } else {
          uncertain = true;
        }
        break;
      case "소득":
        if (check.passed === true) {
          score += SCORE.INCOME_FREE;
        } else {
          uncertain = true;
        }
        break;
      default:
        // 신청기간 등 기타 체크는 배점하지 않음 (마감 여부는 위에서 이미 걸렀다)
        break;
    }
  }

  // 원본: 제한 조건이 하나도 없는 정책은 안내 사유를 남긴다
  if (reasons.length === 0 && !uncertain) {
    reasons.push("나이·지역·소득·취업상태 제한이 없는 정책이에요.");
  }

  // 관심 분야 (프로필 온보딩 + 자가진단 결과 합산)
  const interests = new Set(
    [...(input.profile?.interests ?? []), ...(input.diagnosisInterests ?? [])].map((s) =>
      normalizeCategory(s),
    ),
  );
  const category = normalizeCategory(policy.category);
  if (interests.has(category)) {
    score += SCORE.INTEREST_MATCH;
    reasons.push(`관심 분야(${category}) 일치`);
  }

  // 지원금액 — 원본은 100만원 초과 시 가점. 베이스 amount는 만원 단위.
  if (policy.amount !== null && policy.amount >= 100) {
    score += SCORE.HIGH_AMOUNT;
    reasons.push(`높은 지원금액 (약 ${formatManwon(policy.amount)})`);
  }

  // 마감 임박 (D-14 이내) — 지금 신청할 가치가 높은 정책 강조
  if (policy.dDay !== null && policy.dDay >= 0 && policy.dDay <= 14) {
    score += SCORE.DEADLINE_SOON;
    reasons.push(`마감 임박 (D-${policy.dDay})`);
  }

  // 이미 북마크한 정책은 새 추천 가치가 낮으므로 감점 (원본의 trackings 감점 포팅)
  if (input.bookmarkIds?.includes(policy.id)) {
    score += SCORE.BOOKMARK_PENALTY;
  }

  // 확인 불가 항목이 있으면 안내 사유 추가 (원본의 partial 안내 문구 포팅)
  if (uncertain) {
    reasons.push("일부 조건(소득 등)은 자동 확인이 어려워요. 정책 원문에서 확인해주세요.");
  }

  return {
    policy,
    score: Math.max(0, Math.min(100, score)),
    tier: uncertain ? "partial" : "full",
    reasons,
  };
}

export interface RankOptions {
  /** 최대 추천 개수 (기본 10 — 원본과 동일) */
  limit?: number;
  /** 이 점수 이하는 추천에서 제외 (기본 20 — 원본의 score > 20 필터) */
  minScore?: number;
}

/**
 * 정책 목록 전체를 스코어링해 추천 순으로 랭킹.
 * excluded(부적격) 및 저점수 정책은 제외하고 점수 내림차순 상위 limit개를 반환한다.
 */
export function rankPolicies(
  policies: PolicyWithEligibility[],
  input: MatchInput,
  options: RankOptions = {},
): ScoredPolicy[] {
  const { limit = 10, minScore = 20 } = options;
  return policies
    .map((p) => scorePolicy(p, input))
    .filter((s) => s.tier !== "excluded" && s.score > minScore)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.policy.amount ?? 0) - (a.policy.amount ?? 0) ||
        (a.policy.dDay ?? 9999) - (b.policy.dDay ?? 9999),
    )
    .slice(0, limit);
}
