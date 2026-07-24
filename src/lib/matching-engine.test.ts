import { describe, expect, it } from "vitest";
import {
  calculateAge,
  extractDiagnosisInterests,
  rankPolicies,
  scorePolicy,
  SCORE,
  type MatchInput,
} from "./matching-engine";
import type { PolicyWithEligibility } from "./youth/types";

// 원본(이윤호 브랜치) matching-engine.test.ts 를 베이스 PolicyWithEligibility 구조에 맞게 포팅.
// 자격 판정은 베이스 eligibility.ts가 만들어 주는 checks를 그대로 입력으로 쓰므로,
// 테스트도 checks 조합을 픽스처로 구성한다.

/** 체크 항목 헬퍼 */
function check(label: string, passed: boolean | null, detail: string) {
  return { label, passed, detail };
}

/** 기본 픽스처 — 연령·거주지·취업상태 제한이 있고 모두 충족, 소득 조건 없음 */
function makePolicy(overrides: Partial<PolicyWithEligibility> = {}): PolicyWithEligibility {
  return {
    id: "P1",
    name: "테스트 정책",
    keywords: ["주거", "청년"],
    description: "설명",
    category: "주거",
    subCategory: "전월세",
    supportContent: "지원내용",
    institution: "국토부",
    periodStart: null,
    periodEnd: null,
    applyMethod: "온라인 신청",
    documents: "",
    applyUrl: "",
    refUrls: [],
    minAge: 19,
    maxAge: 34,
    ageLimited: true,
    earnMin: null,
    earnMax: null,
    additionalQualification: "",
    regionCodes: ["11110"],
    jobCodes: ["0013003"],
    eligible: true,
    fullMatch: true,
    checks: [
      check("연령", true, "만 19~34세"),
      check("거주지", true, "특정 지역 한정"),
      check("소득", true, "소득 조건 없음"),
      check("취업상태", true, "특정 취업상태 대상"),
    ],
    dDay: null,
    directApply: false,
    regionScope: "local",
    amount: null,
    ...overrides,
  };
}

const baseInput: MatchInput = {
  profile: { age: 25, regionCode: "11110", jobCode: "0013003", interests: [] },
  diagnosisInterests: [],
  bookmarkIds: [],
};

// 기본 픽스처의 기대 점수: 연령 20 + 거주지 15 + 소득 10 + 취업상태 15 = 60
const BASE_SCORE =
  SCORE.AGE_MATCH + SCORE.REGION_MATCH + SCORE.INCOME_FREE + SCORE.JOB_MATCH;

describe("calculateAge", () => {
  it("생일이 지난 경우 만 나이를 그대로 계산한다", () => {
    const at = new Date(2026, 5, 15); // 2026-06-15
    expect(calculateAge(new Date(2000, 0, 1), at)).toBe(26);
  });

  it("생일이 아직 안 지난 경우 1을 뺀다", () => {
    const at = new Date(2026, 5, 15); // 2026-06-15
    expect(calculateAge(new Date(2000, 11, 25), at)).toBe(25);
  });

  it("오늘이 생일인 경우 이미 생일이 지난 것으로 본다", () => {
    const at = new Date(2026, 5, 15);
    expect(calculateAge(new Date(2000, 5, 15), at)).toBe(26);
  });
});

describe("scorePolicy - 부적격(excluded)", () => {
  it("eligible=false면 다른 조건과 무관하게 excluded + 사유 없음", () => {
    const result = scorePolicy(makePolicy({ eligible: false }), baseInput);
    expect(result.tier).toBe("excluded");
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("체크 항목 중 하나라도 ✕(false)면 excluded", () => {
    const policy = makePolicy({
      checks: [
        check("연령", true, "만 19~34세"),
        check("거주지", false, "특정 지역 한정"), // 실패
        check("소득", true, "소득 조건 없음"),
        check("취업상태", true, "특정 취업상태 대상"),
      ],
    });
    const result = scorePolicy(policy, baseInput);
    expect(result.tier).toBe("excluded");
    expect(result.reasons).toEqual([]);
  });
});

describe("scorePolicy - 나이 조건", () => {
  it("연령 제한이 있고 충족하면 20점 + 사유를 남긴다", () => {
    const result = scorePolicy(makePolicy(), baseInput);
    expect(result.score).toBe(BASE_SCORE);
    expect(result.reasons.some((r) => r.includes("나이 조건 충족"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("만 25세"))).toBe(true);
  });

  it("연령 제한이 없으면 10점만 주고 나이 사유는 남기지 않는다", () => {
    const policy = makePolicy({
      checks: [
        check("연령", true, "연령 제한 없음"),
        check("거주지", true, "특정 지역 한정"),
        check("소득", true, "소득 조건 없음"),
        check("취업상태", true, "특정 취업상태 대상"),
      ],
    });
    const result = scorePolicy(policy, baseInput);
    expect(result.score).toBe(BASE_SCORE - SCORE.AGE_MATCH + SCORE.AGE_NO_LIMIT);
    expect(result.reasons.some((r) => r.includes("나이 조건 충족"))).toBe(false);
  });

  it("연령 확인 불가(passed=null)면 배점 없이 partial", () => {
    const policy = makePolicy({
      checks: [
        check("연령", null, "만 19~34세 (내 나이 미입력)"),
        check("거주지", true, "특정 지역 한정"),
        check("소득", true, "소득 조건 없음"),
        check("취업상태", true, "특정 취업상태 대상"),
      ],
    });
    const result = scorePolicy(policy, { ...baseInput, profile: { regionCode: "11110" } });
    expect(result.tier).toBe("partial");
    expect(result.score).toBe(BASE_SCORE - SCORE.AGE_MATCH);
  });
});

describe("scorePolicy - 지역 조건", () => {
  it("특정 지역 조건 충족 시 지역명이 담긴 사유를 남긴다", () => {
    const result = scorePolicy(makePolicy(), baseInput);
    expect(result.reasons.some((r) => r.includes("지역 조건 충족"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("서울특별시"))).toBe(true);
  });

  it("전국 정책은 15점을 받지만 지역 사유는 남기지 않는다", () => {
    const policy = makePolicy({
      checks: [
        check("연령", true, "만 19~34세"),
        check("거주지", true, "전국"),
        check("소득", true, "소득 조건 없음"),
        check("취업상태", true, "특정 취업상태 대상"),
      ],
    });
    const result = scorePolicy(policy, baseInput);
    expect(result.score).toBe(BASE_SCORE);
    expect(result.reasons.some((r) => r.includes("지역 조건 충족"))).toBe(false);
  });
});

describe("scorePolicy - 취업상태 조건", () => {
  it("특정 취업상태 조건 충족 시 상태명이 담긴 사유를 남긴다", () => {
    const result = scorePolicy(makePolicy(), baseInput);
    expect(result.reasons.some((r) => r.includes("취업상태 조건 충족"))).toBe(true);
    expect(result.reasons.some((r) => r.includes("미취업자"))).toBe(true);
  });
});

describe("scorePolicy - 소득 조건", () => {
  it("소득 조건 확인 불가(passed=null)면 partial + 안내 사유를 남긴다", () => {
    const policy = makePolicy({
      checks: [
        check("연령", true, "만 19~34세"),
        check("거주지", true, "특정 지역 한정"),
        check("소득", null, "소득 조건 있음 (정책 원문 확인)"),
        check("취업상태", true, "특정 취업상태 대상"),
      ],
    });
    const result = scorePolicy(policy, baseInput);
    expect(result.tier).toBe("partial");
    expect(result.score).toBe(BASE_SCORE - SCORE.INCOME_FREE);
    expect(result.reasons.some((r) => r.includes("정책 원문에서 확인해주세요"))).toBe(true);
  });
});

describe("scorePolicy - 제한 없는 정책", () => {
  it("모든 항목이 제한 없음이면 안내 사유를 남기고 full", () => {
    const policy = makePolicy({
      checks: [
        check("연령", true, "연령 제한 없음"),
        check("거주지", true, "전국"),
        check("소득", true, "소득 조건 없음"),
        check("취업상태", true, "제한 없음"),
      ],
    });
    const result = scorePolicy(policy, baseInput);
    expect(result.tier).toBe("full");
    expect(
      result.reasons.some((r) => r.includes("제한이 없는 정책")),
    ).toBe(true);
  });
});

describe("scorePolicy - 보너스/감점", () => {
  it("관심 분야가 카테고리와 일치하면 20점 가산 + 사유", () => {
    const input: MatchInput = {
      ...baseInput,
      profile: { ...baseInput.profile, interests: ["주거"] },
    };
    const result = scorePolicy(makePolicy(), input);
    expect(result.score).toBe(BASE_SCORE + SCORE.INTEREST_MATCH);
    expect(result.reasons.some((r) => r.includes("관심 분야(주거) 일치"))).toBe(true);
  });

  it("자가진단 관심 분야도 동일하게 가산된다", () => {
    const input: MatchInput = { ...baseInput, diagnosisInterests: ["주거"] };
    const result = scorePolicy(makePolicy(), input);
    expect(result.score).toBe(BASE_SCORE + SCORE.INTEREST_MATCH);
  });

  it("지원금 100만원 이상이면 10점 가산 + 사유", () => {
    const result = scorePolicy(makePolicy({ amount: 200 }), baseInput);
    expect(result.score).toBe(BASE_SCORE + SCORE.HIGH_AMOUNT);
    expect(result.reasons.some((r) => r.includes("높은 지원금액"))).toBe(true);
  });

  it("지원금 100만원 미만이면 가산하지 않는다", () => {
    const result = scorePolicy(makePolicy({ amount: 50 }), baseInput);
    expect(result.score).toBe(BASE_SCORE);
  });

  it("마감 임박(D-14 이내)이면 10점 가산 + 사유", () => {
    const result = scorePolicy(makePolicy({ dDay: 7 }), baseInput);
    expect(result.score).toBe(BASE_SCORE + SCORE.DEADLINE_SOON);
    expect(result.reasons.some((r) => r.includes("마감 임박 (D-7)"))).toBe(true);
  });

  it("이미 북마크한 정책은 30점 감점된다", () => {
    const result = scorePolicy(makePolicy(), { ...baseInput, bookmarkIds: ["P1"] });
    expect(result.score).toBe(BASE_SCORE + SCORE.BOOKMARK_PENALTY);
  });

  it("모든 가산이 겹쳐도 100점을 넘지 않는다", () => {
    const input: MatchInput = {
      ...baseInput,
      profile: { ...baseInput.profile, interests: ["주거"] },
    };
    const result = scorePolicy(makePolicy({ amount: 500, dDay: 3 }), input);
    expect(result.score).toBe(100);
  });
});

describe("rankPolicies", () => {
  it("점수 내림차순으로 정렬하고 excluded는 제외한다", () => {
    const policies = [
      makePolicy({ id: "A" }), // 60점
      makePolicy({ id: "B", amount: 300, dDay: 5 }), // 80점
      makePolicy({ id: "C", eligible: false }), // excluded
    ];
    const ranked = rankPolicies(policies, baseInput);
    expect(ranked.map((r) => r.policy.id)).toEqual(["B", "A"]);
  });

  it("minScore(기본 20) 이하 점수는 추천에서 제외한다", () => {
    // 모든 항목 확인 불가 → 0점 partial
    const lowScore = makePolicy({
      id: "LOW",
      checks: [
        check("연령", null, "만 19~34세 (내 나이 미입력)"),
        check("거주지", null, "특정 지역 한정 (거주지 미입력)"),
        check("소득", null, "소득 조건 있음 (정책 원문 확인)"),
        check("취업상태", null, "특정 취업상태 대상 (미입력)"),
      ],
    });
    const ranked = rankPolicies([lowScore, makePolicy({ id: "OK" })], baseInput);
    expect(ranked.map((r) => r.policy.id)).toEqual(["OK"]);
  });

  it("limit 개수만큼만 반환한다", () => {
    const policies = Array.from({ length: 15 }, (_, i) => makePolicy({ id: `P${i}` }));
    const ranked = rankPolicies(policies, baseInput, { limit: 5 });
    expect(ranked).toHaveLength(5);
  });

  it("동점이면 지원금이 큰 정책을 우선한다", () => {
    // 둘 다 마감 임박 가산 없이 amount 가산만 동일하게 받도록 구성
    const a = makePolicy({ id: "A", amount: 100 });
    const b = makePolicy({ id: "B", amount: 900 });
    const ranked = rankPolicies([a, b], baseInput);
    expect(ranked[0].policy.id).toBe("B");
  });
});

describe("extractDiagnosisInterests", () => {
  it("interests 배열에서 표준 분류명으로 정규화해 추출한다", () => {
    expect(extractDiagnosisInterests({ interests: ["주거", "일자리"] })).toEqual([
      "주거",
      "일자리",
    ]);
  });

  it("categories 등 대체 필드명도 인식한다", () => {
    expect(extractDiagnosisInterests({ categories: ["금융･복지･문화"] })).toEqual(["복지문화"]);
  });

  it("형태가 다르거나 비어 있으면 빈 배열을 반환한다", () => {
    expect(extractDiagnosisInterests(null)).toEqual([]);
    expect(extractDiagnosisInterests("문자열")).toEqual([]);
    expect(extractDiagnosisInterests({ interests: "주거" })).toEqual([]);
    expect(extractDiagnosisInterests({ foo: "bar" })).toEqual([]);
  });
});
