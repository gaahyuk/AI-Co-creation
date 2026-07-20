import { describe, expect, it } from "vitest";
import { calculateAge, evaluateMatch, type PolicyInput, type ProfileInput } from "./matching-engine";

// 오늘 기준으로 정확히 `age`세가 되도록 생일을 역산한다.
// 월/일을 하루 당겨서 "올해 생일이 이미 지난" 상태를 항상 보장해 테스트를 실행일과 무관하게 만든다.
function birthDateForAge(age: number): Date {
  const now = new Date();
  return new Date(now.getFullYear() - age, now.getMonth(), now.getDate() - 1);
}

const baseProfile: ProfileInput = {
  birthDate: birthDateForAge(25),
  regionCode: "11",
  jobStatus: "unemployed",
  incomeBracket: "100_or_less",
  incomeAmount: null,
};

const basePolicy: PolicyInput = {
  conditionsVerified: true,
  ageMin: null,
  ageMax: null,
  regionCodes: null,
  jobStatusCodes: null,
  incomeCondition: null,
};

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

describe("evaluateMatch - conditionsVerified", () => {
  it("false면 다른 조건과 무관하게 needs_check로 분류한다", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, conditionsVerified: false, ageMax: 10 });
    expect(result.tier).toBe("needs_check");
    expect(result.reasons[0]).toContain("직접 확인해주세요");
  });
});

describe("evaluateMatch - 나이 조건", () => {
  it("조건이 없으면 나이와 무관하게 통과한다", () => {
    const result = evaluateMatch(baseProfile, basePolicy);
    expect(result.tier).toBe("full");
  });

  it("범위 안이면 충족 사유를 남기고 full", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, ageMin: 19, ageMax: 34 });
    expect(result.tier).toBe("full");
    expect(result.reasons.some((r) => r.includes("나이 조건 충족"))).toBe(true);
  });

  it("최소 나이 미달이면 excluded", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, ageMin: 30 });
    expect(result.tier).toBe("excluded");
    expect(result.reasons).toEqual([]);
  });

  it("최대 나이 초과면 excluded", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, ageMax: 20 });
    expect(result.tier).toBe("excluded");
  });
});

describe("evaluateMatch - 지역 조건", () => {
  it("빈 배열이면 전국 정책으로 취급해 통과한다", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, regionCodes: [] });
    expect(result.tier).toBe("full");
  });

  it("프로필 지역코드가 목록에 있으면 통과", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, regionCodes: ["11", "41"] });
    expect(result.tier).toBe("full");
    expect(result.reasons.some((r) => r.includes("거주지역 조건 충족"))).toBe(true);
  });

  it("프로필 지역코드가 목록에 없으면 excluded", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, regionCodes: ["26", "41"] });
    expect(result.tier).toBe("excluded");
  });
});

describe("evaluateMatch - 고용상태 조건", () => {
  it("목록에 있으면 통과", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, jobStatusCodes: ["unemployed", "student"] });
    expect(result.tier).toBe("full");
  });

  it("목록에 없으면 excluded", () => {
    const result = evaluateMatch(baseProfile, { ...basePolicy, jobStatusCodes: ["employed"] });
    expect(result.tier).toBe("excluded");
  });
});

describe("evaluateMatch - 소득조건 (bracket_percent)", () => {
  const condition = { type: "bracket_percent" as const, maxPercent: 100 };

  it("사용자 구간이 상한 이하면 full", () => {
    const profile = { ...baseProfile, incomeBracket: "50_or_less" };
    const result = evaluateMatch(profile, { ...basePolicy, incomeCondition: condition });
    expect(result.tier).toBe("full");
    expect(result.reasons.some((r) => r.includes("소득 조건 충족"))).toBe(true);
  });

  it("사용자 구간이 상한 초과면 excluded", () => {
    const profile = { ...baseProfile, incomeBracket: "200_or_less" };
    const result = evaluateMatch(profile, { ...basePolicy, incomeCondition: condition });
    expect(result.tier).toBe("excluded");
  });

  it("소득구간을 모르면(unknown) partial + 안내 문구", () => {
    const profile = { ...baseProfile, incomeBracket: "unknown" };
    const result = evaluateMatch(profile, { ...basePolicy, incomeCondition: condition });
    expect(result.tier).toBe("partial");
    expect(result.reasons.some((r) => r.includes("확인되지 않았습니다"))).toBe(true);
  });
});

describe("evaluateMatch - 소득조건 (amount_max, 절대금액)", () => {
  const condition = { type: "amount_max" as const, maxAnnualWon: 45_000_000 };

  it("연소득 미입력이면 partial", () => {
    const profile = { ...baseProfile, incomeAmount: null };
    const result = evaluateMatch(profile, { ...basePolicy, incomeCondition: condition });
    expect(result.tier).toBe("partial");
  });

  it("연소득이 상한 이하면 full", () => {
    const profile = { ...baseProfile, incomeAmount: 30_000_000 };
    const result = evaluateMatch(profile, { ...basePolicy, incomeCondition: condition });
    expect(result.tier).toBe("full");
    expect(result.reasons.some((r) => r.includes("4,500만원 이하"))).toBe(true);
  });

  it("연소득이 상한 초과면 excluded", () => {
    const profile = { ...baseProfile, incomeAmount: 100_000_000 };
    const result = evaluateMatch(profile, { ...basePolicy, incomeCondition: condition });
    expect(result.tier).toBe("excluded");
  });
});

describe("evaluateMatch - 잘못된 형태의 incomeCondition", () => {
  it("type이 없거나 필드가 안 맞으면 조건 없음으로 취급한다", () => {
    const result = evaluateMatch(baseProfile, {
      ...basePolicy,
      incomeCondition: { foo: "bar" },
    });
    expect(result.tier).toBe("full");
  });
});

describe("evaluateMatch - 복합 조건", () => {
  it("나이·지역 모두 충족하면 사유 2개와 함께 full", () => {
    const result = evaluateMatch(baseProfile, {
      ...basePolicy,
      ageMin: 19,
      ageMax: 34,
      regionCodes: ["11"],
    });
    expect(result.tier).toBe("full");
    expect(result.reasons).toHaveLength(2);
  });

  it("하나라도 실패하면 다른 조건 충족 여부와 무관하게 excluded", () => {
    const result = evaluateMatch(baseProfile, {
      ...basePolicy,
      ageMin: 19,
      ageMax: 34, // 통과
      regionCodes: ["26"], // 실패 (프로필은 11)
    });
    expect(result.tier).toBe("excluded");
    expect(result.reasons).toEqual([]);
  });
});
