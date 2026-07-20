import type { OcrClient, OcrResult } from "@/lib/adapters/types";

// 네이버 클로바 OCR 실제 키 발급 전까지 사용하는 mock 구현체.
// 실제 OCR처럼 이미지 픽셀을 읽지는 못하므로, 업로드된 파일명에 포함된 키워드로
// 그럴듯한 한국어 공문서 샘플 텍스트를 골라 반환한다. 키워드가 없으면 분류가 애매한
// 일반 문서 텍스트를 반환해 "미분류" 경로도 재현한다.
const SAMPLE_TEXTS: Record<string, string> = {
  resident_registration:
    "주민등록등본\n세대주 성명: 홍길동\n주소: 서울특별시 종로구 세종대로 1\n발급일: 2026-01-05",
  income_certificate:
    "소득금액증명원\n귀속연도: 2025\n성명: 홍길동\n소득금액: 24,000,000원\n국세청장",
  employment_certificate:
    "재직증명서\n성명: 홍길동\n부서: 개발팀\n직위: 사원\n재직기간: 2024-03-01 ~ 현재",
  unemployment_certificate:
    "수급자격증명서(구직급여)\n성명: 홍길동\n수급기간: 2026-01-01 ~ 2026-06-30\n고용센터장",
  family_relation_certificate:
    "가족관계증명서\n본인: 홍길동\n부: 홍판서\n모: 성춘향\n등록기준지: 서울특별시",
  bankbook_copy: "통장사본\n은행명: 국민은행\n예금주: 홍길동\n계좌번호: 123-456-789012",
};

const FALLBACK_TEXT = "문서 제목 없음\n스캔된 이미지입니다. 자동 분류를 위한 키워드를 찾지 못했습니다.";

const FILENAME_HINTS: Array<[RegExp, keyof typeof SAMPLE_TEXTS]> = [
  [/등본/, "resident_registration"],
  [/소득/, "income_certificate"],
  [/재직/, "employment_certificate"],
  [/실업|구직급여|수급/, "unemployment_certificate"],
  [/가족관계/, "family_relation_certificate"],
  [/통장|계좌/, "bankbook_copy"],
];

function pickSampleText(fileName: string): string {
  for (const [pattern, key] of FILENAME_HINTS) {
    if (pattern.test(fileName)) {
      return SAMPLE_TEXTS[key];
    }
  }
  return FALLBACK_TEXT;
}

class MockClovaOcrClient implements OcrClient {
  async extractText(fileName: string): Promise<OcrResult> {
    const text = pickSampleText(fileName);
    return { text, confidence: text === FALLBACK_TEXT ? 0.4 : 0.95 };
  }
}

export function createMockClovaOcrClient(): OcrClient {
  return new MockClovaOcrClient();
}
