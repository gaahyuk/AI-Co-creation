/** 만원 단위 금액을 "1억 2,000만원" / "240만원" 형태로 */
export function formatManwon(m: number): string {
  if (m >= 10000) {
    const eok = Math.floor(m / 10000);
    const rest = m % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${m.toLocaleString()}만원`;
}
