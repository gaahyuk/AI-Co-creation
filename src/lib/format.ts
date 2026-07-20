// 원(₩) 금액을 한국식 "N억 M,MMM만원" / "N만원" 표기로 변환한다.
// 접두어("약 ")는 호출부에서 붙인다.
export function formatManwon(won: number): string {
  const man = Math.round(won / 10000);
  if (man <= 0) return "0원";
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok > 0) {
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${man.toLocaleString()}만원`;
}
