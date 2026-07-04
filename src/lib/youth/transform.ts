import type { Policy, RawYouthPolicy } from "./types";

/** "YYYYMMDD" → "YYYY-MM-DD", 빈값이면 null */
function parseYmd(ymd: string): string | null {
  const t = (ymd ?? "").trim();
  if (!/^\d{8}$/.test(t)) return null;
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
}

/** 콤마 구분 문자열 → 공백 제거된 배열 (빈 항목 제외) */
function splitList(value: string): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 숫자 문자열 → number, 비정상이면 null */
function parseNum(value: string): number | null {
  const t = (value ?? "").trim();
  if (t === "" || !/^-?\d+$/.test(t)) return null;
  return Number(t);
}

/** API 원본 정책을 앱 도메인 모델로 정규화 */
export function toPolicy(raw: RawYouthPolicy): Policy {
  return {
    id: raw.plcyNo,
    name: raw.plcyNm ?? "",
    keywords: splitList(raw.plcyKywdNm),
    description: raw.plcyExplnCn ?? "",
    category: raw.lclsfNm ?? "",
    subCategory: raw.mclsfNm ?? "",
    supportContent: raw.plcySprtCn ?? "",
    institution: raw.sprvsnInstCdNm ?? "",
    periodStart: parseYmd(raw.bizPrdBgngYmd),
    periodEnd: parseYmd(raw.bizPrdEndYmd),
    applyMethod: raw.plcyAplyMthdCn ?? "",
    documents: raw.sbmsnDcmntCn ?? "",
    applyUrl: (raw.aplyUrlAddr ?? "").trim(),
    refUrls: [raw.refUrlAddr1, raw.refUrlAddr2]
      .map((u) => (u ?? "").trim())
      .filter((u) => u.length > 0),
    minAge: parseNum(raw.sprtTrgtMinAge),
    maxAge: parseNum(raw.sprtTrgtMaxAge),
    ageLimited: (raw.sprtTrgtAgeLmtYn ?? "").trim().toUpperCase() === "Y",
    earnMin: parseNum(raw.earnMinAmt),
    earnMax: parseNum(raw.earnMaxAmt),
    additionalQualification: raw.addAplyQlfcCndCn ?? "",
    regionCodes: splitList(raw.zipCd),
    jobCodes: splitList(raw.jobCd),
  };
}
