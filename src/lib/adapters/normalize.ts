import type { NormalizedPolicy, RawPolicyRecord } from "@/lib/adapters/types";
import { tagConditionsFromText } from "@/lib/adapters/subsidy24/text-condition-tagger";

// 온통청년: API가 이미 나이/지역/소득/고용상태를 구조화된 필드로 내려준다고 가정.
// 값이 있는 그대로 표준 스키마에 매핑되므로 conditionsVerified는 항상 true.
export function normalizeYouthCenter(raw: RawPolicyRecord): NormalizedPolicy {
  return {
    sourceSystem: "youth_center",
    sourceId: raw.sourceId,
    title: raw.title,
    category: raw.category,
    ageMin: raw.ageMin ?? null,
    ageMax: raw.ageMax ?? null,
    regionCodes: raw.regionCodes && raw.regionCodes.length > 0 ? raw.regionCodes : null,
    jobStatusCodes:
      raw.jobStatusCodes && raw.jobStatusCodes.length > 0 ? raw.jobStatusCodes : null,
    incomeCondition: raw.incomeCondition ?? null,
    rawConditionText: raw.rawConditionText ?? null,
    description: raw.description ?? null,
    supportContent: raw.supportContent ?? null,
    conditionsVerified: true,
    applyStart: raw.applyStart ? new Date(raw.applyStart) : null,
    applyEnd: raw.applyEnd ? new Date(raw.applyEnd) : null,
    applyUrl: raw.applyUrl ?? null,
    requiredDocTypes: raw.requiredDocTypes ?? [],
    requiredDocsText: raw.requiredDocsText ?? null,
    provisionInstName: raw.provisionInstName ?? null,
    keywords: raw.keywords ?? null,
    estimatedAmount: raw.estimatedAmount ?? null,
  };
}

// 보조금24: 나이/소득 조건이 자유텍스트(rawConditionText)로만 내려온다고 가정하고,
// text-condition-tagger로 정규식 추출을 시도한다. 추출된 신호가 하나도 없으면
// (나이/소득 모두 실패) 자동 매칭이 불가능하다고 보고 conditionsVerified=false 처리해
// "확인 필요" 배지로 노출한다.
export function normalizeSubsidy24(raw: RawPolicyRecord): NormalizedPolicy {
  const tagged = raw.rawConditionText ? tagConditionsFromText(raw.rawConditionText) : {};

  const ageMin = raw.ageMin ?? tagged.ageMin ?? null;
  const ageMax = raw.ageMax ?? tagged.ageMax ?? null;
  const incomeCondition: NormalizedPolicy["incomeCondition"] =
    raw.incomeCondition ??
    (tagged.incomeMaxPercent != null
      ? { type: "bracket_percent", maxPercent: tagged.incomeMaxPercent }
      : null);

  const hasAnyStructuredSignal = ageMin != null || ageMax != null || incomeCondition != null;

  return {
    sourceSystem: "subsidy24",
    sourceId: raw.sourceId,
    title: raw.title,
    category: raw.category,
    ageMin,
    ageMax,
    regionCodes: raw.regionCodes && raw.regionCodes.length > 0 ? raw.regionCodes : null,
    jobStatusCodes:
      raw.jobStatusCodes && raw.jobStatusCodes.length > 0 ? raw.jobStatusCodes : null,
    incomeCondition,
    rawConditionText: raw.rawConditionText ?? null,
    description: raw.description ?? null,
    supportContent: raw.supportContent ?? null,
    conditionsVerified: hasAnyStructuredSignal,
    applyStart: raw.applyStart ? new Date(raw.applyStart) : null,
    applyEnd: raw.applyEnd ? new Date(raw.applyEnd) : null,
    applyUrl: raw.applyUrl ?? null,
    requiredDocTypes: raw.requiredDocTypes ?? [],
    requiredDocsText: raw.requiredDocsText ?? null,
    provisionInstName: raw.provisionInstName ?? null,
    keywords: raw.keywords ?? null,
    estimatedAmount: raw.estimatedAmount ?? null,
  };
}
