// 온통청년 청년정책 API (getPlcy) 관련 타입

/** API 원본 응답의 개별 정책 객체 (주요 필드만 명시) */
export interface RawYouthPolicy {
  plcyNo: string; // 정책 고유번호
  plcyNm: string; // 정책명
  plcyKywdNm: string; // 키워드 (콤마 구분)
  plcyExplnCn: string; // 정책 설명
  lclsfNm: string; // 대분류명 (예: "주거", "금융･복지･문화")
  mclsfNm: string; // 중분류명
  plcySprtCn: string; // 지원 내용
  sprvsnInstCdNm: string; // 주관기관명
  bizPrdBgngYmd: string; // 사업 시작일 (YYYYMMDD)
  bizPrdEndYmd: string; // 사업 종료일 (YYYYMMDD)
  plcyAplyMthdCn: string; // 신청 방법
  sbmsnDcmntCn: string; // 제출 서류
  aplyUrlAddr: string; // 신청 URL
  refUrlAddr1: string; // 참고 URL 1
  refUrlAddr2: string; // 참고 URL 2
  sprtTrgtMinAge: string; // 지원대상 최소 연령
  sprtTrgtMaxAge: string; // 지원대상 최대 연령
  sprtTrgtAgeLmtYn: string; // 연령 제한 여부 (Y/N)
  earnMinAmt: string; // 소득 하한
  earnMaxAmt: string; // 소득 상한
  earnCndSeCd: string; // 소득 조건 구분 코드
  addAplyQlfcCndCn: string; // 추가 자격조건
  zipCd: string; // 지원 지역 법정동코드 (콤마 구분)
  jobCd: string; // 취업상태 코드 (콤마 구분)
  schoolCd: string; // 학력 코드
}

/** getPlcy 전체 응답 구조 */
export interface YouthApiResponse {
  resultCode: number;
  resultMessage: string;
  result: {
    pagging: { totCount: number; pageNum: number; pageSize: number };
    youthPolicyList: RawYouthPolicy[];
  };
}

/** 앱 내부에서 사용하는 정규화된 정책 도메인 모델 */
export interface Policy {
  id: string; // plcyNo
  name: string; // plcyNm
  keywords: string[]; // plcyKywdNm 분해
  description: string; // plcyExplnCn
  category: string; // lclsfNm
  subCategory: string; // mclsfNm
  supportContent: string; // plcySprtCn
  institution: string; // sprvsnInstCdNm
  periodStart: string | null; // YYYY-MM-DD
  periodEnd: string | null; // YYYY-MM-DD
  applyMethod: string; // plcyAplyMthdCn
  documents: string; // sbmsnDcmntCn
  applyUrl: string; // aplyUrlAddr
  refUrls: string[]; // refUrlAddr1/2
  minAge: number | null; // sprtTrgtMinAge
  maxAge: number | null; // sprtTrgtMaxAge
  ageLimited: boolean; // sprtTrgtAgeLmtYn === 'Y'
  earnMin: number | null;
  earnMax: number | null;
  additionalQualification: string; // addAplyQlfcCndCn
  regionCodes: string[]; // zipCd 분해
  jobCodes: string[]; // jobCd 분해
}

/** API가 반환하는 정책 + 자격 판정 결과 (프론트 소비용) */
export interface PolicyWithEligibility extends Policy {
  eligible: boolean;
  fullMatch: boolean; // 모든 자격 항목이 명시적으로 충족(✓)
  checks: { label: string; passed: boolean | null; detail: string }[];
  dDay: number | null;
  directApply: boolean;
  regionScope: "local" | "wide" | "none";
  amount: number | null; // 1인 추정 지원금(만원), 파싱 실패 시 null
}

/** 사용자 프로필 (맞춤 필터링 기준) */
export interface UserProfile {
  age?: number;
  regionCode?: string; // 법정동 시군구 코드 (5자리, 시군구까지 선택 시)
  sidoCode?: string; // 시도 코드 (2자리, 시도만 선택 시)
  jobCode?: string;
  income?: number; // 월 소득 (만원)
  interests?: string[]; // 관심 정책 분야 (표준 5분류명)
}
