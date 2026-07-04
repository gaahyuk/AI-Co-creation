import type { Policy, UserProfile } from "./types";
import { JOB_NO_LIMIT_CODE } from "../regions";

export interface CheckItem {
  label: string;
  passed: boolean | null; // null = 판단 불가(정보 부족/제한 없음)
  detail: string;
}

export interface Eligibility {
  /** 명확히 부적격(하나라도 false)인지 여부 */
  eligible: boolean;
  checks: CheckItem[];
}

/** 지역코드 매칭: 정책의 법정동코드 목록 중 사용자 시군구코드(앞 5자리)로 시작하는 게 있는지 */
function regionMatches(policyRegionCodes: string[], userRegion?: string): boolean | null {
  if (!userRegion) return null;
  if (policyRegionCodes.length === 0) return null; // 지역 무관(전국)
  const prefix = userRegion.slice(0, 5);
  return policyRegionCodes.some((c) => c.startsWith(prefix) || prefix.startsWith(c.slice(0, 5)));
}

/** 단일 정책에 대한 사용자 자격 판정 + 항목별 체크리스트 */
export function evaluateEligibility(policy: Policy, profile: UserProfile): Eligibility {
  const checks: CheckItem[] = [];

  // 연령 (0 또는 null은 "제한 없음"으로 간주 → 제한이 없으면 충족으로 처리)
  const minAge = policy.minAge && policy.minAge > 0 ? policy.minAge : null;
  const maxAge = policy.maxAge && policy.maxAge > 0 ? policy.maxAge : null;
  if (!policy.ageLimited || (minAge === null && maxAge === null)) {
    checks.push({ label: "연령", passed: true, detail: "연령 제한 없음" });
  } else if (profile.age === undefined) {
    checks.push({ label: "연령", passed: null, detail: `만 ${minAge ?? "-"}~${maxAge ?? "-"}세 (내 나이 미입력)` });
  } else {
    const okMin = minAge === null || profile.age >= minAge;
    const okMax = maxAge === null || profile.age <= maxAge;
    checks.push({
      label: "연령",
      passed: okMin && okMax,
      detail: `만 ${minAge ?? "-"}~${maxAge ?? "-"}세`,
    });
  }

  // 지역 (지역 코드 없는 정책은 전국 → 충족)
  if (policy.regionCodes.length === 0) {
    checks.push({ label: "거주지", passed: true, detail: "전국" });
  } else {
    const region = regionMatches(policy.regionCodes, profile.regionCode);
    checks.push({
      label: "거주지",
      passed: region,
      detail: region === null ? "특정 지역 한정 (거주지 미입력)" : "특정 지역 한정",
    });
  }

  // 소득: 온통청년 earnMaxAmt의 단위/기준(연소득·중위소득 등)이 코드마다 달라
  // 잘못된 비교를 피하기 위해 제외 기준에서 제외하고 안내 정보로만 표시한다.
  if (policy.earnMax === null || policy.earnMax === 0) {
    checks.push({ label: "소득", passed: true, detail: "소득 조건 없음" });
  } else {
    checks.push({ label: "소득", passed: null, detail: "소득 조건 있음 (정책 원문 확인)" });
  }

  // 취업상태 (jobCd가 비었거나 제한없음 코드(0013010) 포함 시 제한 없음)
  const jobUnrestricted =
    policy.jobCodes.length === 0 || policy.jobCodes.includes(JOB_NO_LIMIT_CODE);
  if (jobUnrestricted) {
    checks.push({ label: "취업상태", passed: true, detail: "제한 없음" });
  } else if (!profile.jobCode) {
    checks.push({ label: "취업상태", passed: null, detail: "특정 취업상태 대상 (미입력)" });
  } else {
    checks.push({
      label: "취업상태",
      passed: policy.jobCodes.includes(profile.jobCode),
      detail: "특정 취업상태 대상",
    });
  }

  const eligible = !checks.some((c) => c.passed === false);
  return { eligible, checks };
}

/** 신청 URL이 있어 우리 앱에서 바로 신청 페이지로 연결 가능한지 */
export function isDirectApply(policy: Policy): boolean {
  return policy.applyUrl.length > 0;
}

export type RegionScope = "local" | "wide" | "none";

/**
 * 선택한 지역(시도/시군구) 기준 정책의 지역 범위.
 * - local: 지원 지역이 모두 선택 시도 안에 있는 "지역 전용" 정책
 * - wide:  여러 시도에 걸친(사실상 전국) 정책
 * - none:  지원 지역코드가 없는 정책
 * userRegion이 없으면(전국 조회) 항상 none.
 */
export function regionScope(policy: Policy, userRegion?: string): RegionScope {
  if (policy.regionCodes.length === 0) return "none";
  if (!userRegion) return "none";
  const sido = userRegion.slice(0, 2);
  const sidos = new Set(policy.regionCodes.map((c) => c.slice(0, 2)));
  return sidos.size === 1 && sidos.has(sido) ? "local" : "wide";
}

/** 정책 목록을 사용자 프로필로 필터링 (명확히 부적격인 것 제외) */
export function filterByProfile(policies: Policy[], profile: UserProfile): Policy[] {
  return policies.filter((p) => evaluateEligibility(p, profile).eligible);
}

/** 종료일(YYYY-MM-DD) 기준 남은 일수(날짜 단위, D-N). 종료일 없으면 null */
export function daysUntil(periodEnd: string | null, today = new Date()): number | null {
  if (!periodEnd) return null;
  const end = new Date(`${periodEnd}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ms = end.getTime() - startOfToday.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
