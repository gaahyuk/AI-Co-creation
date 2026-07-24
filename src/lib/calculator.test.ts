import { describe, it, expect } from "vitest";
import {
  MEDIAN_INCOME_MONTHLY,
  incomePercentage,
  calculateIncomeBracket,
  matchesIncomeCondition,
  simulateAsset,
  roadmapMilestones,
  formatWon,
} from "./calculator";

// 계산이 단순하도록 테스트용 중위소득은 100만원으로 고정
const MEDIAN = 1_000_000;

describe("incomePercentage", () => {
  it("중위소득 대비 %를 계산한다", () => {
    expect(incomePercentage(500_000, MEDIAN)).toBe(50);
    expect(incomePercentage(1_200_000, MEDIAN)).toBe(120);
  });

  it("기본값은 원본 상수(4인 가구 월 중위소득)", () => {
    expect(incomePercentage(MEDIAN_INCOME_MONTHLY)).toBe(100);
  });
});

describe("calculateIncomeBracket", () => {
  it("구간 경계값을 원본과 동일하게 판정한다 (경계 포함)", () => {
    expect(calculateIncomeBracket(300_000, MEDIAN)).toBe("30%이하");
    expect(calculateIncomeBracket(300_001, MEDIAN)).toBe("50%이하");
    expect(calculateIncomeBracket(500_000, MEDIAN)).toBe("50%이하");
    expect(calculateIncomeBracket(700_000, MEDIAN)).toBe("70%이하");
    expect(calculateIncomeBracket(1_000_000, MEDIAN)).toBe("100%이하");
    expect(calculateIncomeBracket(1_200_000, MEDIAN)).toBe("120%이하");
    expect(calculateIncomeBracket(1_500_000, MEDIAN)).toBe("150%이하");
    expect(calculateIncomeBracket(2_000_000, MEDIAN)).toBe("200%이하");
    expect(calculateIncomeBracket(2_000_001, MEDIAN)).toBe("200%초과");
  });

  it("소득 0원은 30%이하", () => {
    expect(calculateIncomeBracket(0, MEDIAN)).toBe("30%이하");
  });
});

describe("matchesIncomeCondition", () => {
  it("조건이 없으면 항상 충족", () => {
    expect(matchesIncomeCondition(null, 9_999_999)).toBe(true);
    expect(matchesIncomeCondition(undefined, 9_999_999)).toBe(true);
    expect(matchesIncomeCondition({ type: "none" }, 9_999_999)).toBe(true);
  });

  it("bracket 조건: 중위소득 % 이하만 충족", () => {
    const cond = { type: "bracket" as const, value: "50" };
    expect(matchesIncomeCondition(cond, 400_000, MEDIAN)).toBe(true); // 40%
    expect(matchesIncomeCondition(cond, 500_000, MEDIAN)).toBe(true); // 50% (경계)
    expect(matchesIncomeCondition(cond, 600_000, MEDIAN)).toBe(false); // 60%
  });

  it("amount 조건: lte/gte/eq 연산자를 지원", () => {
    expect(
      matchesIncomeCondition({ type: "amount", operator: "lte", value: 3_000_000 }, 2_500_000),
    ).toBe(true);
    expect(
      matchesIncomeCondition({ type: "amount", operator: "lte", value: 3_000_000 }, 3_500_000),
    ).toBe(false);
    expect(
      matchesIncomeCondition({ type: "amount", operator: "gte", value: 1_000_000 }, 2_000_000),
    ).toBe(true);
    expect(
      matchesIncomeCondition({ type: "amount", operator: "eq", value: 1_000_000 }, 1_000_000),
    ).toBe(true);
    expect(
      matchesIncomeCondition({ type: "amount", operator: "eq", value: 1_000_000 }, 999_999),
    ).toBe(false);
  });

  it("연산자가 없으면 충족으로 간주 (원본 폴백)", () => {
    expect(matchesIncomeCondition({ type: "amount", value: 1 }, 9_999_999)).toBe(true);
  });
});

describe("simulateAsset", () => {
  // 청년내일저축계좌 (원본 시드 데이터)
  const naeil = {
    monthlyContribution: 100_000,
    governmentSupport: 100_000,
    term: 48,
    maxBenefit: 5_000_000,
  };

  it("권장액 저축 시 원본 계산식과 동일한 만기 수령액", () => {
    const r = simulateAsset(naeil, 100_000);
    expect(r.governmentMonthly).toBe(100_000);
    expect(r.term).toBe(48);
    expect(r.totalUserContribution).toBe(4_800_000);
    expect(r.totalGovernmentSupport).toBe(4_800_000); // 500만원 상한 미달
    expect(r.totalSimulated).toBe(9_600_000);
  });

  it("정부 지원은 내가 낸 금액만큼만 매칭된다", () => {
    const r = simulateAsset(naeil, 50_000);
    expect(r.governmentMonthly).toBe(50_000);
    expect(r.totalGovernmentSupport).toBe(2_400_000);
  });

  it("정부 지원은 월 지원 상한을 넘지 않는다", () => {
    const r = simulateAsset(naeil, 200_000);
    expect(r.governmentMonthly).toBe(100_000);
    expect(r.totalUserContribution).toBe(9_600_000);
    expect(r.totalSimulated).toBe(14_400_000);
  });

  it("정부 지원 총액은 maxBenefit으로 캡된다", () => {
    const r = simulateAsset(
      { monthlyContribution: null, governmentSupport: 200_000, term: 60, maxBenefit: 5_000_000 },
      200_000,
    );
    expect(r.governmentMonthly).toBe(200_000);
    // 200,000 × 60 = 12,000,000 → 5,000,000으로 캡
    expect(r.totalGovernmentSupport).toBe(5_000_000);
    expect(r.totalSimulated).toBe(17_000_000);
  });

  it("조건이 비어 있으면 원본 폴백값(월 10만원/48개월/500만원)을 쓴다", () => {
    const r = simulateAsset(
      { monthlyContribution: null, governmentSupport: null, term: null, maxBenefit: null },
      150_000,
    );
    expect(r.governmentMonthly).toBe(100_000);
    expect(r.term).toBe(48);
    expect(r.totalGovernmentSupport).toBe(4_800_000);
  });
});

describe("roadmapMilestones", () => {
  it("만기 48개월이면 원본과 동일한 [12,24,36,48]", () => {
    expect(roadmapMilestones(48)).toEqual([12, 24, 36, 48]);
  });

  it("만기가 짧으면 만기 이내로 제한한다", () => {
    expect(roadmapMilestones(24)).toEqual([12, 24]);
  });

  it("만기가 길면 만기 시점을 추가한다", () => {
    expect(roadmapMilestones(60)).toEqual([12, 24, 36, 48, 60]);
  });
});

describe("formatWon", () => {
  it("1만원 미만은 원 단위", () => {
    expect(formatWon(9_860)).toBe("9,860원");
  });

  it("만원 단위 표기 (소수 1자리까지)", () => {
    expect(formatWon(100_000)).toBe("10만원");
    expect(formatWon(33_000)).toBe("3.3만원");
    expect(formatWon(5_000_000)).toBe("500만원");
  });

  it("억원 단위 표기", () => {
    expect(formatWon(100_000_000)).toBe("1억원");
    expect(formatWon(120_000_000)).toBe("1억 2,000만원");
  });
});
