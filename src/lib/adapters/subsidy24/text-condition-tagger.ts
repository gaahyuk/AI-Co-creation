export type TaggedConditions = {
  ageMin?: number;
  ageMax?: number;
  incomeMaxPercent?: number;
};

// 보조금24는 자격 조건이 자유텍스트로 내려오므로, 정규식 기반으로 나이/소득 조건을
// 최대한 추출한다. 추출에 실패한 필드는 undefined로 남겨 원문 확인이 필요함을 표시한다.
const AGE_RANGE_RE = /만\s*(\d{1,2})\s*세\s*(?:이상|~)\s*(\d{1,2})\s*세\s*(?:이하|까지)/;
const AGE_MIN_ONLY_RE = /만\s*(\d{1,2})\s*세\s*이상/;
const INCOME_RE = /중위소득\s*(\d{1,3})\s*%\s*이하/;

export function tagConditionsFromText(text: string): TaggedConditions {
  const result: TaggedConditions = {};

  const rangeMatch = text.match(AGE_RANGE_RE);
  if (rangeMatch) {
    result.ageMin = Number(rangeMatch[1]);
    result.ageMax = Number(rangeMatch[2]);
  } else {
    const minMatch = text.match(AGE_MIN_ONLY_RE);
    if (minMatch) {
      result.ageMin = Number(minMatch[1]);
    }
  }

  const incomeMatch = text.match(INCOME_RE);
  if (incomeMatch) {
    result.incomeMaxPercent = Number(incomeMatch[1]);
  }

  return result;
}
