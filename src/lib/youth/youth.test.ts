import { describe, it, expect } from "vitest";
import { toPolicy } from "./transform";
import { evaluateEligibility, daysUntil, filterByProfile, regionScope } from "./eligibility";
import type { RawYouthPolicy } from "./types";

const baseRaw: RawYouthPolicy = {
  plcyNo: "P1",
  plcyNm: "테스트 정책",
  plcyKywdNm: "주거, 청년",
  plcyExplnCn: "설명",
  lclsfNm: "주거",
  mclsfNm: "전월세",
  plcySprtCn: "지원내용",
  sprvsnInstCdNm: "국토부",
  bizPrdBgngYmd: "20260101",
  bizPrdEndYmd: "20261231",
  plcyAplyMthdCn: "온라인 신청",
  sbmsnDcmntCn: "신분증",
  aplyUrlAddr: " https://apply.example ",
  refUrlAddr1: "https://ref1.example",
  refUrlAddr2: "",
  sprtTrgtMinAge: "19",
  sprtTrgtMaxAge: "34",
  sprtTrgtAgeLmtYn: "Y",
  earnMinAmt: "0",
  earnMaxAmt: "3000000",
  earnCndSeCd: "0043003",
  addAplyQlfcCndCn: "무주택",
  zipCd: "11110,11140",
  jobCd: "0013010",
  schoolCd: "",
};

describe("toPolicy", () => {
  it("원본을 도메인 모델로 정규화한다", () => {
    const p = toPolicy(baseRaw);
    expect(p.id).toBe("P1");
    expect(p.keywords).toEqual(["주거", "청년"]);
    expect(p.periodEnd).toBe("2026-12-31");
    expect(p.applyUrl).toBe("https://apply.example"); // trim
    expect(p.refUrls).toEqual(["https://ref1.example"]); // 빈값 제외
    expect(p.minAge).toBe(19);
    expect(p.maxAge).toBe(34);
    expect(p.ageLimited).toBe(true);
    expect(p.regionCodes).toEqual(["11110", "11140"]);
  });

  it("잘못된 날짜는 null 처리한다", () => {
    const p = toPolicy({ ...baseRaw, bizPrdEndYmd: "" });
    expect(p.periodEnd).toBeNull();
  });
});

describe("evaluateEligibility", () => {
  const policy = toPolicy(baseRaw);

  it("연령 범위 안이면 적격", () => {
    const r = evaluateEligibility(policy, { age: 25 });
    expect(r.checks.find((c) => c.label === "연령")?.passed).toBe(true);
  });

  it("연령 초과면 부적격", () => {
    const r = evaluateEligibility(policy, { age: 40 });
    expect(r.eligible).toBe(false);
  });

  it("소득은 제외 기준이 아니라 안내 정보로만 표시(판단 불가)", () => {
    const r = evaluateEligibility(policy, { age: 25, income: 5000000 });
    expect(r.checks.find((c) => c.label === "소득")?.passed).toBeNull();
    expect(r.eligible).toBe(true);
  });

  it("지역코드 prefix가 맞으면 적격", () => {
    const r = evaluateEligibility(policy, { age: 25, regionCode: "11110" });
    expect(r.checks.find((c) => c.label === "거주지")?.passed).toBe(true);
  });

  it("연령이 0~0(제한없음 표기)이면 나이 무관하게 적격", () => {
    const noLimit = toPolicy({ ...baseRaw, sprtTrgtMinAge: "0", sprtTrgtMaxAge: "0" });
    const r = evaluateEligibility(noLimit, { age: 50 });
    expect(r.eligible).toBe(true);
    expect(r.checks.find((c) => c.label === "연령")?.passed).toBe(true);
  });

  it("jobCd가 0013010(제한없음)이면 취업상태 무관하게 적격", () => {
    const p = toPolicy({ ...baseRaw, jobCd: "0013010" });
    const r = evaluateEligibility(p, { age: 25, jobCode: "0013003" });
    expect(r.checks.find((c) => c.label === "취업상태")?.passed).toBe(true);
    expect(r.eligible).toBe(true);
  });

  it("특정 취업상태 코드 불일치면 부적격", () => {
    const p = toPolicy({ ...baseRaw, jobCd: "0013001" }); // 재직자 전용
    const r = evaluateEligibility(p, { age: 25, jobCode: "0013003" }); // 미취업자
    expect(r.eligible).toBe(false);
  });

  it("정보 미입력 항목은 null(판단 불가)로 적격 유지", () => {
    const r = evaluateEligibility(policy, {});
    expect(r.eligible).toBe(true);
  });
});

describe("filterByProfile", () => {
  it("부적격 정책을 제외한다", () => {
    const policies = [toPolicy(baseRaw)];
    expect(filterByProfile(policies, { age: 40 })).toHaveLength(0);
    expect(filterByProfile(policies, { age: 25 })).toHaveLength(1);
  });
});

describe("regionScope", () => {
  it("지원지역이 모두 선택 시도 안이면 local", () => {
    const p = toPolicy({ ...baseRaw, zipCd: "26110,26140" }); // 부산만
    expect(regionScope(p, "26")).toBe("local");
  });
  it("여러 시도에 걸치면 wide", () => {
    const p = toPolicy({ ...baseRaw, zipCd: "26110,11110,41110" });
    expect(regionScope(p, "26")).toBe("wide");
  });
  it("지원지역코드 없으면 none", () => {
    const p = toPolicy({ ...baseRaw, zipCd: "" });
    expect(regionScope(p, "26")).toBe("none");
  });
});

describe("daysUntil", () => {
  it("종료일까지 남은 일수를 계산한다", () => {
    const d = daysUntil("2026-06-10", new Date("2026-06-04T00:00:00"));
    expect(d).toBe(6);
  });
  it("종료일 없으면 null", () => {
    expect(daysUntil(null)).toBeNull();
  });
});
