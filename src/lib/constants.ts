// 온통청년 getCtpvCd API가 반환하는 2026년 기준 공식 16개 시도 코드/명칭.
// 구 광주(29)·전남(46)은 "전남광주통합특별시(12)"로 통합되었고,
// 강원(42)·전북(45)은 각각 51·52로 코드가 바뀌었다.
export const REGIONS = [
  { code: "11", name: "서울특별시" },
  { code: "12", name: "전남광주통합특별시" },
  { code: "26", name: "부산광역시" },
  { code: "27", name: "대구광역시" },
  { code: "28", name: "인천광역시" },
  { code: "30", name: "대전광역시" },
  { code: "31", name: "울산광역시" },
  { code: "36", name: "세종특별자치시" },
  { code: "41", name: "경기도" },
  { code: "43", name: "충청북도" },
  { code: "44", name: "충청남도" },
  { code: "47", name: "경상북도" },
  { code: "48", name: "경상남도" },
  { code: "50", name: "제주특별자치도" },
  { code: "51", name: "강원특별자치도" },
  { code: "52", name: "전북특별자치도" },
] as const;

export const JOB_STATUSES = [
  { code: "employed", name: "재직 중" },
  { code: "unemployed", name: "미취업/구직 중" },
  { code: "student", name: "학생" },
  { code: "self_employed", name: "자영업/프리랜서" },
] as const;

export const INCOME_BRACKETS = [
  { code: "50_or_less", name: "기준 중위소득 50% 이하" },
  { code: "100_or_less", name: "기준 중위소득 100% 이하" },
  { code: "150_or_less", name: "기준 중위소득 150% 이하" },
  { code: "200_or_less", name: "기준 중위소득 200% 이하" },
  { code: "over_200", name: "기준 중위소득 200% 초과" },
  { code: "unknown", name: "잘 모름" },
] as const;

export const DOC_TYPES = [
  { code: "resident_registration", name: "주민등록등본" },
  { code: "income_certificate", name: "소득금액증명원" },
  { code: "employment_certificate", name: "재직증명서" },
  { code: "unemployment_certificate", name: "실업급여수급자격증명서" },
  { code: "family_relation_certificate", name: "가족관계증명서" },
  { code: "bankbook_copy", name: "통장사본" },
] as const;

export const TIP_TYPES = [
  { code: "site_down", name: "사이트 접속 안됨/에러", icon: "🔴" },
  { code: "document_tip", name: "서류 준비 팁", icon: "📄" },
  { code: "budget_exhausted", name: "예산 소진 임박/마감된 듯", icon: "⚠️" },
  { code: "general", name: "기타", icon: "💬" },
] as const;

// 카드에 경고 배지를 띄울지 판단할 때 쓰는, "심각한" 제보 유형.
export const URGENT_TIP_TYPES = ["site_down", "budget_exhausted"] as const;

export function tipTypeInfo(code: string) {
  return TIP_TYPES.find((t) => t.code === code) ?? TIP_TYPES[TIP_TYPES.length - 1];
}

export function regionName(code: string | null | undefined) {
  return REGIONS.find((r) => r.code === code)?.name ?? code ?? "-";
}

export function jobStatusName(code: string | null | undefined) {
  return JOB_STATUSES.find((j) => j.code === code)?.name ?? code ?? "-";
}

export function docTypeName(code: string | null | undefined) {
  return DOC_TYPES.find((d) => d.code === code)?.name ?? code ?? "미분류";
}

// 사용자의 소득 구간을 "중위소득 대비 상한 퍼센트"로 환산한다.
// 실제 소득이 얼마인지 몰라도 구간의 상한값으로 보수적으로 비교하기 위함이다.
// "over_200"은 정책이 통상 저소득층을 대상으로 하므로 매우 큰 값(999)으로 사실상 배제되게 한다.
export function bracketToPercentUpperBound(
  bracket: string | null | undefined
): number | null {
  switch (bracket) {
    case "50_or_less":
      return 50;
    case "100_or_less":
      return 100;
    case "150_or_less":
      return 150;
    case "200_or_less":
      return 200;
    case "over_200":
    case "over_150": // 구 코드 하위호환 (200% 초과와 동일하게 취급)
      return 999;
    default:
      return null; // "unknown" 또는 미입력
  }
}
