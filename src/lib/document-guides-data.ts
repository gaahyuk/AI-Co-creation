// 서류 발급 가이드 정적 데이터
// (참조: 이윤호 브랜치 scripts/seed-document-guides.ts 의 시드 데이터를 정적 TS로 이식.
//  DB 대신 클라이언트에서 직접 import 해 사용한다.)

/** 발급처 정보 */
export interface IssuePlace {
  name: string; // 발급처 이름
  address: string; // 주소 또는 웹사이트
  phone: string; // 대표 전화
}

/** 서류 발급 가이드 */
export interface DocumentGuide {
  code: string; // 표준 문서유형 코드 (분류기와 공유)
  title: string; // 서류 이름
  description: string; // 용도 설명
  steps: string[]; // 발급 방법 (순서대로)
  issuePlaces: IssuePlace[]; // 발급처 목록
  fee: number; // 수수료 (원)
  processingDay: number; // 처리 기간 (일, 0이면 즉시)
}

export const DOCUMENT_GUIDES: DocumentGuide[] = [
  {
    code: "resident_registration",
    title: "주민등록등본",
    description: "거주지역, 가족관계 확인용",
    steps: [
      "주민센터 방문 또는 정부24 온라인 신청",
      "신분증 지참",
      "수수료 1,000원",
      "즉시 발급",
    ],
    issuePlaces: [
      { name: "주민센터 (읍면동)", address: "거주지 관할 주민센터", phone: "1588-7776" },
      { name: "정부24", address: "www.gov.kr", phone: "02-2100-8822" },
    ],
    fee: 1000,
    processingDay: 0,
  },
  {
    code: "income_certificate",
    title: "소득금액증명원",
    description: "중위소득 기준 소득 확인용",
    steps: [
      "건강보험공단 방문 또는 온라인",
      "신분증/건강보험증 지참",
      "수수료 무료",
      "5-10분 내 발급",
    ],
    issuePlaces: [
      { name: "국민건강보험공단", address: "www.nhis.or.kr", phone: "1577-1000" },
    ],
    fee: 0,
    processingDay: 0,
  },
  {
    code: "bankbook_copy",
    title: "통장사본",
    description: "자산 및 거래 내역 확인용",
    steps: [
      "은행 방문 또는 ATM",
      "통장과 신분증 지참",
      "ATM에서 자동 발급",
      "또는 창구에서 요청",
    ],
    issuePlaces: [
      { name: "해당 은행 점포", address: "거주지 근처 은행", phone: "각 은행 고객센터" },
    ],
    fee: 0,
    processingDay: 0,
  },
  {
    code: "student_id",
    title: "학생증(재학증명서)",
    description: "학생 신분 확인용",
    steps: [
      "대학교 학사관리 시스템에서 신청",
      "또는 대학 학사관리팀 방문",
      "수수료 무료",
      "당일~3일 발급",
    ],
    issuePlaces: [
      { name: "재학 대학 학사관리팀", address: "대학 캠퍼스 내", phone: "각 대학 대표번호" },
    ],
    fee: 0,
    processingDay: 3,
  },
  {
    code: "employment_certificate",
    title: "재직증명서",
    description: "현재 고용 상태 확인용",
    steps: [
      "회사 인사팀에 요청",
      "또는 정부24에서 발급",
      "수수료 무료",
      "1-2일 내 발급",
    ],
    issuePlaces: [
      { name: "재직 회사", address: "회사 인사팀", phone: "회사 직통" },
      { name: "정부24", address: "www.gov.kr", phone: "02-2100-8822" },
    ],
    fee: 0,
    processingDay: 1,
  },
  {
    code: "family_relation_certificate",
    title: "가족관계증명서",
    description: "부양가족 확인용",
    steps: [
      "대법원 인터넷등기소 또는 주민센터",
      "신분증 지참",
      "수수료 1,000원",
      "즉시 발급",
    ],
    issuePlaces: [
      { name: "대법원 인터넷등기소", address: "www.iros.go.kr", phone: "1588-1234" },
      { name: "주민센터", address: "거주지 관할 주민센터", phone: "1588-7776" },
    ],
    fee: 1000,
    processingDay: 0,
  },
  {
    code: "unemployment_certificate",
    title: "실업급여수급자격증명서",
    description: "구직급여 수급 상태 확인용",
    steps: [
      "고용센터 방문 또는 고용24 온라인 신청",
      "신분증 지참",
      "수수료 무료",
      "즉시 발급",
    ],
    issuePlaces: [
      { name: "고용센터", address: "거주지 관할 고용센터", phone: "국번없이 1350" },
      { name: "고용24", address: "www.work24.go.kr", phone: "1350" },
    ],
    fee: 0,
    processingDay: 0,
  },
];

/** 코드로 가이드 조회 */
export function guideByCode(code: string | null | undefined): DocumentGuide | null {
  if (!code) return null;
  return DOCUMENT_GUIDES.find((g) => g.code === code) ?? null;
}

/** 수수료 표시 문자열 */
export function formatFee(fee: number): string {
  return fee === 0 ? "무료" : `${fee.toLocaleString()}원`;
}

/** 처리 기간 표시 문자열 */
export function formatProcessingDay(day: number): string {
  return day === 0 ? "즉시 발급" : `약 ${day}일 소요`;
}
