import type {
  IncomeCondition,
  PolicySourceClient,
  RawPolicyRecord,
} from "@/lib/adapters/types";
import { tagConditionsFromText } from "@/lib/adapters/subsidy24/text-condition-tagger";

// 온통청년 청년정책 목록 조회 Open API (2024 개편 신 엔드포인트).
// 인증키/페이지 파라미터를 붙여 호출하면 result.youthPolicyList[] 로 정책 목록을 준다.
const API_URL = "https://www.youthcenter.go.kr/go/ythip/getPlcy";
const PAGE_SIZE = 100; // API가 허용하는 페이지 크기(최대 100)

// getPlcy 응답의 정책 1건. 실제로는 60여 개 필드가 오지만, 매칭에 쓰는 것만 선언한다.
interface YouthCenterPolicyRaw {
  plcyNo: string; // 정책번호(고유 ID)
  plcyNm: string; // 정책명
  plcyKywdNm: string; // 정책 키워드(콤마구분, 해시태그용)
  plcyExplnCn: string; // 정책 소개(자유텍스트)
  plcySprtCn: string; // 지원내용(자유텍스트, 금액 추출 대상)
  sprvsnInstCdNm: string; // 주관기관명 (예: 산림청)
  lclsfNm: string; // 정책 대분류(일자리 | 주거 | 교육･직업훈련 | 금융･복지･문화 | 참여･기반)
  sprtTrgtMinAge: string; // 지원대상 최소연령
  sprtTrgtMaxAge: string; // 지원대상 최대연령
  sprtTrgtAgeLmtYn: string; // 연령제한 여부 (Y=제한 있음 / N=제한 없음)
  zipCd: string; // 정책 지역: 법정동코드(5자리) 콤마 목록. 빈 값 = 전국
  earnCndSeCd: string; // 소득조건 구분 (0043001 제한없음 | 0043002 소득범위 | 0043003 기타)
  earnMinAmt: string; // 소득 최소(만원)
  earnMaxAmt: string; // 소득 최대(만원)
  earnEtcCn: string; // 소득 기타내용(자유텍스트, 예: "중위소득 150% 이하")
  addAplyQlfcCndCn: string; // 추가 신청자격 조건내용(자유텍스트)
  jobCd: string; // 취업상태 코드(0013xxx) 콤마 목록. 0013010 = 제한없음
  aplyYmd: string; // 신청기간 "YYYYMMDD ~ YYYYMMDD" 또는 빈 값(상시/연중)
  aplyUrlAddr: string; // 신청 URL
  sbmsnDcmntCn: string; // 제출서류 내용(자유텍스트)
}

interface GetPlcyResponse {
  resultCode: number;
  resultMessage: string;
  result?: {
    pagging: { totCount: number; pageNum: number; pageSize: number };
    youthPolicyList?: YouthCenterPolicyRaw[];
  };
}

// 취업상태 코드(0013xxx) → 앱 내부 고용상태 코드 매핑.
// 0013009(기타)/0013010(제한없음)은 조건 없음으로 취급하므로 매핑에서 제외한다.
const JOB_CD_MAP: Record<string, string> = {
  "0013001": "employed", // 재직자
  "0013002": "self_employed", // 자영업자
  "0013003": "unemployed", // 미취업자
  "0013004": "self_employed", // 프리랜서
  "0013005": "employed", // 일용근로자
  "0013006": "self_employed", // (예비)창업자
  "0013007": "employed", // 단기근로자
  "0013008": "self_employed", // 영농종사자
};

// 제출서류 자유텍스트에서 표준 문서유형 코드를 키워드로 추출한다.
// (붙임파일 안내만 있는 경우가 많아 매칭 실패 시 빈 배열이 정상이다.)
const DOC_KEYWORDS: Array<[RegExp, string]> = [
  [/주민등록\s*등본/, "resident_registration"],
  [/소득\s*(?:금액)?\s*증명|소득\s*증빙/, "income_certificate"],
  [/재직\s*증명/, "employment_certificate"],
  [/실업\s*급여|수급\s*자격/, "unemployment_certificate"],
  [/가족\s*관계\s*증명/, "family_relation_certificate"],
  [/통장\s*사본/, "bankbook_copy"],
];

// 온통청년 대분류(lclsfNm) → 앱 표준 카테고리(constants의 5분류)로 정규화.
const CATEGORY_MAP: Record<string, string> = {
  일자리: "일자리",
  주거: "주거",
  "교육･직업훈련": "교육",
  "금융･복지･문화": "복지문화",
  "참여･기반": "참여권리",
};

function mapCategory(lclsfNm: string): string {
  // lclsfNm은 간혹 "일자리,일자리"처럼 콤마로 중복되어 오므로 첫 세그먼트만 사용한다.
  const first = (lclsfNm ?? "").split(",")[0]?.trim() ?? "";
  return CATEGORY_MAP[first] ?? (first || "기타");
}

// 지원내용 텍스트에서 대표 지원금액(원)을 보수적으로 추출한다.
// "억"/"만원" 단위 금액 중 가장 큰 값을 대표값으로 본다. 명시 금액이 없으면 null
// (그래서 화면에서는 '금액 확인된 정책'만 합산해 추정치로 표시한다).
function extractAmount(text: string): number | null {
  if (!text) return null;
  const amounts: number[] = [];

  // "N억 M만원" / "N억"
  const eokRe = /(\d[\d,]*)\s*억\s*(?:(\d[\d,]*)\s*만원?)?/g;
  for (const m of text.matchAll(eokRe)) {
    const eok = Number(m[1].replace(/,/g, ""));
    const man = m[2] ? Number(m[2].replace(/,/g, "")) : 0;
    if (Number.isFinite(eok)) amounts.push(eok * 100_000_000 + man * 10_000);
  }

  // 단독 "N만원"
  const manRe = /(\d[\d,]*)\s*만원/g;
  for (const m of text.matchAll(manRe)) {
    const man = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(man)) amounts.push(man * 10_000);
  }

  if (amounts.length === 0) return null;
  const max = Math.max(...amounts);
  // 10억 초과는 개인 지원금이 아닐 가능성이 높아 이상치로 제외한다.
  return max > 1_000_000_000 ? null : max;
}

function toAge(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toIsoDate(yyyymmdd: string): string | null {
  const s = yyyymmdd.trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function parseApplyPeriod(aplyYmd: string): { start: string | null; end: string | null } {
  if (!aplyYmd?.trim()) return { start: null, end: null };
  const [rawStart, rawEnd] = aplyYmd.split("~").map((p) => p.trim());
  return {
    start: toIsoDate(rawStart ?? ""),
    end: toIsoDate(rawEnd ?? rawStart ?? ""),
  };
}

// zipCd(법정동코드 5자리 목록)에서 앞 2자리(시도 코드)만 뽑아 중복 제거한다.
// 프로필의 regionCode가 시도 단위(2자리)이므로 같은 단위로 맞춘다. 빈 값이면 전국(null).
function parseRegionCodes(zipCd: string): string[] | null {
  if (!zipCd?.trim()) return null;
  const prefixes = new Set<string>();
  for (const code of zipCd.split(",")) {
    const t = code.trim();
    if (t.length >= 2) prefixes.add(t.slice(0, 2));
  }
  return prefixes.size > 0 ? [...prefixes] : null;
}

function parseJobStatusCodes(jobCd: string): string[] | null {
  if (!jobCd?.trim()) return null;
  const codes = jobCd.split(",").map((c) => c.trim());
  if (codes.includes("0013010")) return null; // 제한없음
  const mapped = new Set<string>();
  for (const c of codes) {
    const m = JOB_CD_MAP[c];
    if (m) mapped.add(m);
  }
  return mapped.size > 0 ? [...mapped] : null; // 매핑 결과 없으면 조건 없음
}

// 소득조건을 앱 스키마로 변환한다.
// - 0043001 제한없음  → 조건 없음
// - 0043002 소득범위  → earnMaxAmt(만원)를 연소득 상한(amount_max)으로 반영.
//   실측 데이터 기준 상한값이 1,200~9,999만원대(예: 전세보증금반환보증 보증료 지원 7,500만원)로
//   통상적인 "연소득 OOO만원 이하" 정책 문구와 일치해 연 단위 금액으로 판단한다.
// - 0043003 기타      → earnEtcCn에서 "중위소득 N% 이하"를 정규식으로 추출 시도
function parseIncome(raw: YouthCenterPolicyRaw): {
  incomeCondition: IncomeCondition | null;
  text: string | null;
} {
  const etc = raw.earnEtcCn?.trim() ?? "";
  switch (raw.earnCndSeCd) {
    case "0043002": {
      const max = Number(raw.earnMaxAmt);
      if (Number.isFinite(max) && max > 0) {
        return {
          incomeCondition: { type: "amount_max", maxAnnualWon: max * 10_000 },
          text: `연소득 ${max.toLocaleString()}만원 이하`,
        };
      }
      return { incomeCondition: null, text: etc || null };
    }
    case "0043003": {
      const tagged = etc ? tagConditionsFromText(etc) : {};
      const incomeCondition: IncomeCondition | null =
        tagged.incomeMaxPercent != null
          ? { type: "bracket_percent", maxPercent: tagged.incomeMaxPercent }
          : null;
      return { incomeCondition, text: etc || null };
    }
    default:
      return { incomeCondition: null, text: null };
  }
}

function parseDocTypes(sbmsnDcmntCn: string): string[] {
  if (!sbmsnDcmntCn) return [];
  const found = new Set<string>();
  for (const [re, code] of DOC_KEYWORDS) {
    if (re.test(sbmsnDcmntCn)) found.add(code);
  }
  return [...found];
}

// 자유텍스트 필드(제출서류/정책소개/지원내용 공통)를 표시용으로 정리한다.
// 줄바꿈은 살리되 과한 공백만 접는다. "자세한 내용은 붙임파일 확인" 안내뿐이면 null 처리.
function cleanFreeText(raw: string): string | null {
  const text = (raw ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  if (!text) return null;
  if (/^[☞※\-\s]*자세한\s*내용은\s*붙임\s*파일/.test(text)) return null;
  return text;
}

function mapToRawRecord(p: YouthCenterPolicyRaw): RawPolicyRecord {
  const ageLimited = p.sprtTrgtAgeLmtYn === "Y";
  const { start, end } = parseApplyPeriod(p.aplyYmd);
  const { incomeCondition, text } = parseIncome(p);
  const conditionTexts = [text, p.addAplyQlfcCndCn?.trim()].filter(
    (t): t is string => !!t
  );

  return {
    sourceId: p.plcyNo,
    title: p.plcyNm,
    category: mapCategory(p.lclsfNm),
    // 연령제한이 없으면(N) min/max 값이 채워져 있어도 조건 없음으로 둔다.
    ageMin: ageLimited ? toAge(p.sprtTrgtMinAge) : null,
    ageMax: ageLimited ? toAge(p.sprtTrgtMaxAge) : null,
    regionCodes: parseRegionCodes(p.zipCd),
    jobStatusCodes: parseJobStatusCodes(p.jobCd),
    incomeCondition,
    rawConditionText: conditionTexts.length > 0 ? conditionTexts.join(" / ") : null,
    description: cleanFreeText(p.plcyExplnCn),
    supportContent: cleanFreeText(p.plcySprtCn),
    applyStart: start,
    applyEnd: end,
    applyUrl: p.aplyUrlAddr?.trim() || null,
    requiredDocTypes: parseDocTypes(p.sbmsnDcmntCn),
    requiredDocsText: cleanFreeText(p.sbmsnDcmntCn),
    provisionInstName: p.sprvsnInstCdNm?.trim() || null,
    keywords: p.plcyKywdNm?.trim() || null,
    estimatedAmount: extractAmount(p.plcySprtCn),
  };
}

class RealYouthCenterClient implements PolicySourceClient {
  constructor(private readonly apiKey: string) {}

  async fetchPolicies({ page }: { page: number; updatedSince?: Date }): Promise<RawPolicyRecord[]> {
    const url = new URL(API_URL);
    url.searchParams.set("apiKeyNm", this.apiKey);
    url.searchParams.set("pageNum", String(page));
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    url.searchParams.set("rtnType", "json");

    // 대량 페이지네이션 중 간헐적 네트워크/일시 오류에 대비해 최대 3회 재시도한다.
    let res: Response | undefined;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) break;
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastErr = err;
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
    if (!res || !res.ok) {
      throw new Error(`온통청년 API 호출 실패(page ${page}): ${String(lastErr)}`);
    }

    const body = (await res.json()) as GetPlcyResponse;
    if (body.resultCode !== 200) {
      throw new Error(`온통청년 API 오류: [${body.resultCode}] ${body.resultMessage}`);
    }

    return (body.result?.youthPolicyList ?? []).map(mapToRawRecord);
  }
}

export function createRealYouthCenterClient(): PolicySourceClient {
  const apiKey = process.env.YOUTH_CENTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "YOUTH_CENTER_API_KEY 환경변수가 설정되지 않았습니다. .env에 인증키를 넣어주세요."
    );
  }
  return new RealYouthCenterClient(apiKey);
}
