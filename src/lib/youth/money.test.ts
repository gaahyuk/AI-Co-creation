import { describe, it, expect } from "vitest";
import { extractAmount, sumAmounts } from "./money";
import { toPolicy } from "./transform";
import type { RawYouthPolicy } from "./types";

function policyWith(support: string, desc = ""): ReturnType<typeof toPolicy> {
  const raw = {
    plcyNo: "T",
    plcyNm: "t",
    plcyKywdNm: "",
    plcyExplnCn: desc,
    lclsfNm: "",
    mclsfNm: "",
    plcySprtCn: support,
    sprvsnInstCdNm: "",
    bizPrdBgngYmd: "",
    bizPrdEndYmd: "",
    plcyAplyMthdCn: "",
    sbmsnDcmntCn: "",
    aplyUrlAddr: "",
    refUrlAddr1: "",
    refUrlAddr2: "",
    sprtTrgtMinAge: "",
    sprtTrgtMaxAge: "",
    sprtTrgtAgeLmtYn: "N",
    earnMinAmt: "",
    earnMaxAmt: "",
    earnCndSeCd: "",
    addAplyQlfcCndCn: "",
    zipCd: "",
    jobCd: "",
    schoolCd: "",
  } as RawYouthPolicy;
  return toPolicy(raw);
}

describe("extractAmount", () => {
  it("만원 단위 금액을 추출한다", () => {
    expect(extractAmount(policyWith("1인 최대 240만원 지원"))).toBe(240);
  });

  it("월 N만원은 기간 명시 없으면 연 환산(×12)한다", () => {
    expect(extractAmount(policyWith("월 5만원 교통비 지급"))).toBe(60);
  });

  it("월 N만원 + 최대 M개월이면 ×M으로 계산한다", () => {
    expect(extractAmount(policyWith("1인당 월 150만원, 최대 3개월 지원"))).toBe(450);
  });

  it("기간이 12개월 초과여도 12개월로 캡한다", () => {
    expect(extractAmount(policyWith("월 10만원, 24개월간 지원"))).toBe(120);
  });

  it("여러 금액 중 최대값을 쓴다", () => {
    expect(extractAmount(policyWith("적립 10만원, 정부지원 240만원"))).toBe(240);
  });

  it("억원 단위는 제외한다", () => {
    expect(extractAmount(policyWith("총 242억 원 규모 사업"))).toBeNull();
  });

  it("예산 문맥의 금액은 제외한다", () => {
    expect(extractAmount(policyWith("사업비 5,000만원 규모"))).toBeNull();
  });

  it("원 단위는 만원으로 환산, 1만원 미만은 무시", () => {
    expect(extractAmount(policyWith("지원금 500,000원"))).toBe(50);
    expect(extractAmount(policyWith("시급 9,860원"))).toBeNull();
  });

  it("금액 없으면 null", () => {
    expect(extractAmount(policyWith("공간 운영 지원"))).toBeNull();
  });
});

describe("sumAmounts", () => {
  it("추출 가능한 정책만 합산한다", () => {
    const r = sumAmounts([
      policyWith("최대 100만원"),
      policyWith("공간 지원"),
      policyWith("월 10만원"),
    ]);
    expect(r.total).toBe(220);
    expect(r.counted).toBe(2);
  });
});
