// 자산형성 상품 정적 데이터
// (이윤호 브랜치 scripts/seed-asset-formation-policies.ts 의 시드 데이터를 정적 이식하고,
//  대표 자산형성 상품 2종을 같은 스키마로 확장)

import type { AssetTerms } from "./calculator";

export interface AssetProduct extends AssetTerms {
  id: string;
  /** 상품명 */
  name: string;
  /** 원본 분류 코드 */
  category: string;
  /** 주관 기관 */
  institution: string;
  /** 상품 소개 */
  description: string;
  /** 관련 정책 검색 키워드 (온통청년 검색용) */
  keyword: string;
  /** 계산 전제에 대한 안내 문구 */
  note: string;
}

export const ASSET_PRODUCTS: AssetProduct[] = [
  {
    // 원본 시드(seed-asset-formation-policies.ts) 수치 그대로 이식
    id: "naeil-savings",
    name: "청년내일저축계좌",
    category: "savings_account",
    institution: "보건복지부",
    description:
      "일하는 저소득 청년이 매월 저축하면 정부가 같은 금액을 매칭해 주는 자산형성 통장이에요.",
    keyword: "청년내일저축",
    monthlyContribution: 100_000, // 월 10만원
    governmentSupport: 100_000, // 정부 월 10만원 매칭
    term: 48, // 4년
    maxBenefit: 5_000_000, // 정부 지원 최대 500만원
    note: "월 10만원 저축 + 정부 월 10만원 매칭(최대 500만원) 기준의 추정치예요.",
  },
  {
    id: "jump-account",
    name: "청년도약계좌",
    category: "savings_account",
    institution: "금융위원회",
    description:
      "5년간 자유롭게 납입하면 소득 구간에 따라 정부기여금과 비과세 혜택을 받는 중장기 자산형성 상품이에요.",
    keyword: "청년도약계좌",
    monthlyContribution: 700_000, // 월 최대 70만원 납입
    governmentSupport: 33_000, // 월 정부기여금 최대 수준(소득 구간별 상이)의 단순화 값
    term: 60, // 5년
    maxBenefit: 1_980_000, // 33,000원 × 60개월
    note: "정부기여금은 개인소득 구간에 따라 달라져요. 최대 수준 기준의 추정치이며 이자·비과세 혜택은 제외했어요.",
  },
  {
    id: "hope-savings",
    name: "청년희망적금",
    category: "savings_account",
    institution: "금융위원회",
    description:
      "2년 만기 적금에 저축장려금을 얹어 주는 청년 대상 적금 상품이에요.",
    keyword: "청년 적금",
    monthlyContribution: 500_000, // 월 최대 50만원 납입
    governmentSupport: 15_000, // 저축장려금(최대 36만원)을 월 환산한 단순화 값
    term: 24, // 2년
    maxBenefit: 360_000, // 저축장려금 최대 36만원
    note: "저축장려금(1년차 2%·2년차 4%, 최대 36만원)을 월 환산한 추정치이며 은행 이자는 제외했어요.",
  },
];

/** id로 상품 찾기 */
export function findAssetProduct(id: string): AssetProduct | undefined {
  return ASSET_PRODUCTS.find((p) => p.id === id);
}
