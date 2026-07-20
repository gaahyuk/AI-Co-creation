import { bracketToPercentUpperBound, regionName, jobStatusName } from "@/lib/constants";
import type { IncomeCondition } from "@/lib/adapters/types";

export type MatchTier = "full" | "partial" | "needs_check" | "excluded";

export interface MatchOutcome {
  tier: MatchTier;
  reasons: string[];
}

export interface ProfileInput {
  birthDate: Date;
  regionCode: string;
  jobStatus: string;
  incomeBracket: string | null;
  incomeAmount: number | null; // 연소득(원). 절대금액 소득조건(amount_max) 판정에만 사용.
}

export interface PolicyInput {
  conditionsVerified: boolean;
  ageMin: number | null;
  ageMax: number | null;
  regionCodes: unknown;
  jobStatusCodes: unknown;
  incomeCondition: unknown;
}

export function calculateAge(birthDate: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    at.getMonth() > birthDate.getMonth() ||
    (at.getMonth() === birthDate.getMonth() && at.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asIncomeCondition(value: unknown): IncomeCondition | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { type?: unknown; maxPercent?: unknown; maxAnnualWon?: unknown };
  if (v.type === "bracket_percent" && typeof v.maxPercent === "number") {
    return value as IncomeCondition;
  }
  if (v.type === "amount_max" && typeof v.maxAnnualWon === "number") {
    return value as IncomeCondition;
  }
  return null;
}

export function evaluateMatch(profile: ProfileInput, policy: PolicyInput): MatchOutcome {
  if (!policy.conditionsVerified) {
    return {
      tier: "needs_check",
      reasons: [
        "이 정책은 조건이 원문 텍스트로만 제공되어 자동 추출에 실패했습니다. 신청 페이지에서 자격 조건을 직접 확인해주세요.",
      ],
    };
  }

  const reasons: string[] = [];
  let failed = false;
  let uncertain = false;

  const age = calculateAge(profile.birthDate);
  if (policy.ageMin != null || policy.ageMax != null) {
    const minOk = policy.ageMin == null || age >= policy.ageMin;
    const maxOk = policy.ageMax == null || age <= policy.ageMax;
    if (minOk && maxOk) {
      reasons.push(`나이 조건 충족 (만 ${age}세)`);
    } else {
      failed = true;
    }
  }

  const regionCodes = asStringArray(policy.regionCodes);
  if (regionCodes.length > 0) {
    if (regionCodes.includes(profile.regionCode)) {
      reasons.push(`거주지역 조건 충족 (${regionName(profile.regionCode)})`);
    } else {
      failed = true;
    }
  }

  const jobStatusCodes = asStringArray(policy.jobStatusCodes);
  if (jobStatusCodes.length > 0) {
    if (jobStatusCodes.includes(profile.jobStatus)) {
      reasons.push(`고용상태 조건 충족 (${jobStatusName(profile.jobStatus)})`);
    } else {
      failed = true;
    }
  }

  const incomeCondition = asIncomeCondition(policy.incomeCondition);
  if (incomeCondition?.type === "bracket_percent") {
    const userPercent = bracketToPercentUpperBound(profile.incomeBracket);
    if (userPercent == null) {
      uncertain = true;
    } else if (userPercent <= incomeCondition.maxPercent) {
      reasons.push(`소득 조건 충족 (기준 중위소득 ${incomeCondition.maxPercent}% 이하)`);
    } else {
      failed = true;
    }
  } else if (incomeCondition?.type === "amount_max") {
    // 연소득 절대금액 상한 조건. 프로필에 등록한 연소득과 직접 비교한다.
    if (profile.incomeAmount == null) {
      uncertain = true;
    } else {
      const maxManwon = Math.round(incomeCondition.maxAnnualWon / 10000);
      if (profile.incomeAmount <= incomeCondition.maxAnnualWon) {
        reasons.push(`소득 조건 충족 (연소득 ${maxManwon.toLocaleString()}만원 이하)`);
      } else {
        failed = true;
      }
    }
  }

  if (failed) {
    return { tier: "excluded", reasons: [] };
  }

  if (reasons.length === 0) {
    reasons.push("나이·지역·소득·고용상태 제한이 없는 정책입니다.");
  }

  if (uncertain) {
    reasons.push("정확한 소득 정보를 등록하지 않아 소득 조건 충족 여부는 확인되지 않았습니다.");
  }

  return { tier: uncertain ? "partial" : "full", reasons };
}
