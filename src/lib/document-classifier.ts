// OCR로 추출된 텍스트에서 표준 문서유형 코드를 추정한다.
// 키워드가 여러 유형에 걸치지 않는 한 매칭되는 첫 유형을 사용하고,
// 아무 키워드도 없으면 null(미분류)을 반환해 사용자가 직접 지정하게 한다.
const DOC_TYPE_KEYWORDS: Array<[RegExp, string]> = [
  [/주민등록/, "resident_registration"],
  [/소득금액증명|소득증명/, "income_certificate"],
  [/재직증명/, "employment_certificate"],
  [/수급자격|구직급여|실업급여/, "unemployment_certificate"],
  [/가족관계증명/, "family_relation_certificate"],
  [/통장사본|계좌번호/, "bankbook_copy"],
];

export function classifyDocType(ocrText: string): string | null {
  for (const [pattern, docType] of DOC_TYPE_KEYWORDS) {
    if (pattern.test(ocrText)) {
      return docType;
    }
  }
  return null;
}
