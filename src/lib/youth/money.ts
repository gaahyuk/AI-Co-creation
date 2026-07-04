import type { Policy } from "./types";

// 지원내용(plcySprtCn) 텍스트에서 1인 지원금(만원 단위)을 추정 추출한다.
// 정확한 구조화 필드가 없어 휴리스틱 기반이며, UI에서는 항상 "추정"으로 표기할 것.

const AMOUNT_RE = /(\d[\d,]*(?:\.\d+)?)\s*(억\s*원|만\s*원|원)/g;
// 사업 총예산 문맥(개인 지원금 아님) — 금액 직전 30자 안에 있으면 제외
const BUDGET_CONTEXT = /(예산|총\s*사업비|사업비|규모|기금)/;

interface Found {
  amountManwon: number; // 만원 단위
  monthly: boolean;
}

/** 텍스트에서 후보 금액들을 추출 */
function findAmounts(text: string): Found[] {
  const out: Found[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const numStr = m[1].replace(/,/g, "");
    const num = Number(numStr);
    if (!Number.isFinite(num) || num <= 0) continue;
    const unit = m[2].replace(/\s/g, "");

    // 금액 직전 문맥으로 총예산 여부 판단
    const before = text.slice(Math.max(0, m.index! - 30), m.index!);
    if (BUDGET_CONTEXT.test(before)) continue;

    let manwon: number;
    if (unit === "억원") {
      // 억 단위는 대부분 총예산/한도(전세보증 등). 개인 수령액으로 보기 어려워 제외.
      continue;
    } else if (unit === "만원") {
      manwon = num;
    } else {
      // "원" 단위: 1만원 미만 소액(시급 등)은 제외
      if (num < 10000) continue;
      manwon = num / 10000;
    }

    const monthly = /(월|매월|월\s*최대)\s*[^\d]{0,6}$/.test(before) || /월\s*$/.test(before);
    out.push({ amountManwon: manwon, monthly });
  }
  return out;
}

// "최대 3개월", "6개월간", "24개월" 등 지원 기간(개월) 추출
const DURATION_RE = /(?:최대\s*)?(\d{1,2})\s*개월/g;

/** 텍스트에 명시된 지원 기간(개월). 여러 개면 최대값, 없으면 null. 12개월 초과는 12로 캡. */
function findDurationMonths(text: string): number | null {
  let max: number | null = null;
  for (const m of text.matchAll(DURATION_RE)) {
    const n = Number(m[1]);
    if (n >= 1 && (max === null || n > max)) max = n;
  }
  return max === null ? null : Math.min(max, 12);
}

/**
 * 정책의 1인 추정 지원금(만원). 추출 불가 시 null.
 * 여러 금액이 있으면 최대값. 월 단위 금액은:
 *  - 텍스트에 지원 기간("최대 N개월")이 있으면 ×N
 *  - 없으면 ×12(연 환산)
 */
export function extractAmount(policy: Policy): number | null {
  const text = `${policy.supportContent}\n${policy.description}`;
  const found = findAmounts(text);
  if (found.length === 0) return null;
  const months = findDurationMonths(text) ?? 12;
  const totals = found.map((f) => (f.monthly ? f.amountManwon * months : f.amountManwon));
  const best = Math.max(...totals);
  // 비정상 거대값(파싱 오류 방어): 1억(=10,000만원) 초과는 신뢰하지 않음
  return best > 10000 ? null : Math.round(best);
}

/** 정책 목록의 추정 지원금 합산(만원). 금액 없는 정책은 0으로 취급. */
export function sumAmounts(policies: Policy[]): { total: number; counted: number } {
  let total = 0;
  let counted = 0;
  for (const p of policies) {
    const a = extractAmount(p);
    if (a !== null) {
      total += a;
      counted++;
    }
  }
  return { total, counted };
}
