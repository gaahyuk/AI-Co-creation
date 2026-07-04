import type { Policy, YouthApiResponse } from "./types";
import { toPolicy } from "./transform";

const BASE_URL = "https://www.youthcenter.go.kr/go/ythip/getPlcy";

export interface FetchPoliciesParams {
  pageNum?: number;
  pageSize?: number;
  keyword?: string; // plcyKywdNm
  category?: string; // lclsfNm (대분류)
  regionCode?: string; // zipCd
  plcyNo?: string; // 단건 상세
}

export interface FetchPoliciesResult {
  policies: Policy[];
  totalCount: number;
  pageNum: number;
  pageSize: number;
}

function getApiKey(): string {
  const key = process.env.YOUTH_API_KEY;
  if (!key) throw new Error("YOUTH_API_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

/** 온통청년 getPlcy 호출 → 정규화된 정책 목록 반환 */
export async function fetchPolicies(
  params: FetchPoliciesParams = {},
): Promise<FetchPoliciesResult> {
  const url = new URL(BASE_URL);
  url.searchParams.set("apiKeyNm", getApiKey());
  url.searchParams.set("rtnType", "json");
  url.searchParams.set("pageNum", String(params.pageNum ?? 1));
  url.searchParams.set("pageSize", String(params.pageSize ?? 20));
  if (params.keyword) url.searchParams.set("plcyKywdNm", params.keyword);
  if (params.category) url.searchParams.set("lclsfNm", params.category);
  if (params.regionCode) url.searchParams.set("zipCd", params.regionCode);
  if (params.plcyNo) url.searchParams.set("plcyNo", params.plcyNo);

  // 정책 데이터는 자주 바뀌지 않으므로 1시간 캐싱
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`온통청년 API 오류: HTTP ${res.status}`);
  }

  const data = (await res.json()) as YouthApiResponse;
  if (data.resultCode !== 200) {
    throw new Error(`온통청년 API 오류: ${data.resultMessage}`);
  }

  const list = data.result?.youthPolicyList ?? [];
  return {
    policies: list.map(toPolicy),
    totalCount: data.result?.pagging?.totCount ?? list.length,
    pageNum: data.result?.pagging?.pageNum ?? 1,
    pageSize: data.result?.pagging?.pageSize ?? list.length,
  };
}

/** plcyNo로 단건 상세 조회 */
export async function fetchPolicyById(plcyNo: string): Promise<Policy | null> {
  const { policies } = await fetchPolicies({ plcyNo, pageSize: 1 });
  return policies[0] ?? null;
}

/**
 * 주어진 필터(키워드/카테고리/지역)에 해당하는 정책을 여러 페이지에 걸쳐 모두 수집한다.
 * "바로신청" 같이 응답 필드 기준 후처리가 필요한 경우 사용. maxItems로 상한을 둔다.
 */
export async function fetchAllPolicies(
  params: Omit<FetchPoliciesParams, "pageNum" | "pageSize"> = {},
  maxItems = 1000,
): Promise<Policy[]> {
  const pageSize = 100;
  const first = await fetchPolicies({ ...params, pageNum: 1, pageSize });
  const all = [...first.policies];
  const totalPages = Math.ceil(Math.min(first.totalCount, maxItems) / pageSize);

  for (let page = 2; page <= totalPages; page++) {
    const { policies } = await fetchPolicies({ ...params, pageNum: page, pageSize });
    all.push(...policies);
    if (all.length >= maxItems) break;
  }
  return all.slice(0, maxItems);
}
