// 소득 계산기 · 자산형성 시뮬레이터의 순수 계산 로직
// (이윤호 브랜치 /api/calculator/simulate, /api/asset-formation/simulate 의 계산식을
//  API 라우트 없이 클라이언트에서 쓸 수 있도록 순수 함수로 이식)

/** 기준 중위소득 (월, 원) — 원본 상수: 2025년 4인 가구 기준 */
export const MEDIAN_INCOME_MONTHLY = 5_380_000;

/** 소득이 중위소득 대비 몇 %인지 (income과 medianIncome은 같은 단위로) */
export function incomePercentage(
  income: number,
  medianIncome: number = MEDIAN_INCOME_MONTHLY,
): number {
  return (income / medianIncome) * 100;
}

/** 중위소득 구간 판정 (원본 calculateIncomeBracket 충실 이식) */
export function calculateIncomeBracket(
  income: number,
  medianIncome: number = MEDIAN_INCOME_MONTHLY,
): string {
  const percentage = (income / medianIncome) * 100;

  if (percentage <= 30) return "30%이하";
  if (percentage <= 50) return "50%이하";
  if (percentage <= 70) return "70%이하";
  if (percentage <= 100) return "100%이하";
  if (percentage <= 120) return "120%이하";
  if (percentage <= 150) return "150%이하";
  if (percentage <= 200) return "200%이하";
  return "200%초과";
}

/** 정책의 소득 조건 (원본 IncomeCondition 이식) */
export interface IncomeCondition {
  type: "bracket" | "amount" | "none";
  operator?: "lte" | "gte" | "eq";
  value?: string | number;
  min?: number;
  max?: number;
}

/**
 * 소득 조건 충족 여부 판정 (원본 시뮬레이트 라우트의 필터 로직 이식)
 * - bracket: 중위소득 % 기준 (예: value "50" → 중위소득 50% 이하만 충족)
 * - amount: 절대 금액 기준 (lte/gte/eq)
 * - 조건이 없거나 해석 불가하면 충족으로 간주
 */
export function matchesIncomeCondition(
  condition: IncomeCondition | null | undefined,
  incomeAmount: number,
  medianIncome: number = MEDIAN_INCOME_MONTHLY,
): boolean {
  if (!condition || condition.type === "none") return true;

  if (condition.type === "bracket") {
    const bracketValue = parseFloat(String(condition.value));
    const userBracketValue = (incomeAmount / medianIncome) * 100;
    return userBracketValue <= bracketValue;
  }

  if (condition.type === "amount") {
    const conditionAmount = Number(condition.value);
    if (condition.operator === "lte") return incomeAmount <= conditionAmount;
    if (condition.operator === "gte") return incomeAmount >= conditionAmount;
    if (condition.operator === "eq") return incomeAmount === conditionAmount;
  }

  return true;
}

/** 자산형성 상품의 계약 조건 (원본 AssetFormationPolicy 필드 이식) */
export interface AssetTerms {
  /** 권장 월 납입액 (원) */
  monthlyContribution: number | null;
  /** 월 정부 지원액 (원) */
  governmentSupport: number | null;
  /** 만기 (개월) */
  term: number | null;
  /** 정부 지원 총액 상한 (원) */
  maxBenefit: number | null;
}

export interface AssetSimulation {
  /** 내 월 납입액 (원) */
  monthlyAmount: number;
  /** 정부 월 지원액 (원) — 내 납입액을 넘지 않음 */
  governmentMonthly: number;
  /** 만기 (개월) */
  term: number;
  /** 만기까지 내 납입 총액 (원) */
  totalUserContribution: number;
  /** 만기까지 정부 지원 총액 (원, 상한 적용) */
  totalGovernmentSupport: number;
  /** 만기 예상 수령액 (원) */
  totalSimulated: number;
}

/**
 * 자산형성 만기 수령액 시뮬레이션 (원본 /api/asset-formation/simulate 계산식 충실 이식)
 * - 정부 월 지원은 "내가 낸 금액만큼만" 매칭 (min)
 * - 정부 지원 총액은 상품별 상한(maxBenefit)으로 캡
 * - 기본값(원본 폴백): 정부 월 지원 10만원, 만기 48개월, 상한 500만원
 */
export function simulateAsset(terms: AssetTerms, monthlyAmount: number): AssetSimulation {
  const userMonthly = monthlyAmount;
  const governmentMonthly = Math.min(
    monthlyAmount, // 사용자가 낸 금액만큼만
    terms.governmentSupport || 100_000,
  );

  const term = terms.term || 48;
  const totalUserContribution = userMonthly * term;
  const totalGovernmentSupport = Math.min(
    governmentMonthly * term,
    terms.maxBenefit || 5_000_000,
  );
  const totalSimulated = totalUserContribution + totalGovernmentSupport;

  return {
    monthlyAmount: userMonthly,
    governmentMonthly,
    term,
    totalUserContribution,
    totalGovernmentSupport,
    totalSimulated,
  };
}

/**
 * 자산 형성 로드맵 마일스톤(개월) — 원본의 [12, 24, 36, 48]을
 * 만기 이내로 제한하고 만기 시점을 항상 포함하도록 보정
 */
export function roadmapMilestones(term: number): number[] {
  const base = [12, 24, 36, 48].filter((m) => m < term);
  return [...base, term];
}

/** 원 단위 금액을 한국어 표기로 ("1억 2,000만원" / "10만원" / "9,860원") */
export function formatWon(won: number): string {
  if (won >= 10_000) {
    const man = Math.round((won / 10_000) * 10) / 10; // 만원 단위, 소수 1자리
    if (man >= 10_000) {
      const eok = Math.floor(man / 10_000);
      const rest = Math.round(man % 10_000);
      return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${man.toLocaleString()}만원`;
  }
  return `${won.toLocaleString()}원`;
}
