import { NextRequest, NextResponse } from "next/server";
import { fetchPolicies, fetchAllPolicies } from "@/lib/youth/client";
import {
  evaluateEligibility,
  daysUntil,
  isDirectApply,
  regionScope,
} from "@/lib/youth/eligibility";
import { extractAmount } from "@/lib/youth/money";
import { sigunguCodesForSido, normalizeCategory } from "@/lib/regions";
import type { Policy, UserProfile } from "@/lib/youth/types";

/**
 * GET /api/policies
 * 쿼리: page, size, keyword, category, regionCode(시군구 5자리), age, jobCode, income, directOnly
 *
 * 지역/카테고리/키워드는 온통청년 API 서버에서 직접 필터링(zipCd/lclsfNm/plcyKywdNm)하고,
 * 페이지네이션도 API 페이지를 그대로 사용한다. 나이/소득/취업상태는 API 필터가 없으므로
 * 각 정책에 자격 판정(eligible/checks)을 붙이고, 적격 정책을 위로 정렬한다(제외하지 않음).
 *
 * directOnly=true 인 경우: 신청 URL이 있는 "바로신청" 정책만 모아 BFF에서 자체 페이지네이션한다.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const regionCode = sp.get("regionCode") ?? undefined; // 시군구 5자리
  const sido = sp.get("sido") ?? undefined; // 시도 2자리

  const profile: UserProfile = {
    age: sp.get("age") ? Number(sp.get("age")) : undefined,
    // 자격 판정의 지역 매칭은 prefix 비교 → 시군구 5자리 또는 시도 2자리 모두 가능
    regionCode: regionCode ?? sido,
    jobCode: sp.get("jobCode") ?? undefined,
    income: sp.get("income") ? Number(sp.get("income")) : undefined,
  };

  // API zipCd는 5자리 시군구만 인식. 시도만 선택 시 해당 시도의 모든 시군구 코드로 확장.
  const apiRegion = regionCode ?? (sido ? sigunguCodesForSido(sido).join(",") : undefined);

  const page = sp.get("page") ? Number(sp.get("page")) : 1;
  const size = sp.get("size") ? Number(sp.get("size")) : 12;
  const directOnly = sp.get("directOnly") === "true";
  const eligibleOnly = sp.get("eligibleOnly") === "true";
  // 관심 분야(표준 분류명, 콤마 구분) — 정규화된 카테고리로 후처리 필터
  const interests = (sp.get("interests") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const filter = {
    keyword: sp.get("keyword") ?? undefined,
    category: sp.get("category") ?? undefined,
    regionCode: apiRegion,
  };

  const annotate = (p: Policy) => {
    const { eligible, checks } = evaluateEligibility(p, profile);
    const dDay = daysUntil(p.periodEnd);
    // 신청기간이 이미 지난 정책은 부적격 처리
    const expired = dDay !== null && dDay < 0;
    if (expired) {
      checks.push({ label: "신청기간", passed: false, detail: `${p.periodEnd} 마감됨` });
    }
    // 자격충족: 모든 항목이 충족(✓). "제한 없음"도 충족으로 평가되므로 전항목 ✓ 가능
    const fullMatch =
      !expired && checks.length > 0 && checks.every((c) => c.passed === true);
    return {
      ...p,
      eligible: eligible && !expired,
      fullMatch,
      checks,
      dDay,
      directApply: isDirectApply(p),
      regionScope: regionScope(p, profile.regionCode),
      amount: extractAmount(p),
    };
  };

  // 정렬: 적격 우선 → ①마감임박(D-14 이내, 임박한 순) ②모든 자격 충족(✓ 전부)
  //        ③지원금 높은 순 ④나머지는 지역 전용 우선
  const scopeRank = (s: string) => (s === "local" ? 0 : s === "wide" ? 1 : 2);
  type Sortable = {
    eligible: boolean;
    fullMatch: boolean;
    regionScope: string;
    dDay: number | null;
    amount: number | null;
  };
  const tier = (p: Sortable) => {
    if (p.dDay !== null && p.dDay >= 0 && p.dDay <= 14) return 0; // 마감임박
    if (p.fullMatch) return 1; // 자격 전부 충족
    if (p.amount !== null && p.amount > 0) return 2; // 지원금 있음
    return 3; // 나머지
  };
  const byEligibleThenLocal = (a: Sortable, b: Sortable) => {
    const eligibleDiff = Number(b.eligible) - Number(a.eligible);
    if (eligibleDiff !== 0) return eligibleDiff;
    const ta = tier(a);
    const tb = tier(b);
    if (ta !== tb) return ta - tb;
    if (ta === 0) return (a.dDay ?? 99) - (b.dDay ?? 99); // 임박한 순
    if (ta === 1 || ta === 2) return (b.amount ?? 0) - (a.amount ?? 0); // 금액 큰 순
    return scopeRank(a.regionScope) - scopeRank(b.regionScope); // 기존 정렬
  };

  try {
    // 응답 필드 기준 후처리(바로신청/신청가능/관심분야)가 필요하면 전체를 모아 자체 페이지네이션
    if (directOnly || eligibleOnly || interests.length > 0) {
      const all = (await fetchAllPolicies(filter))
        .map(annotate)
        .filter(
          (p) =>
            (!directOnly || p.directApply) &&
            (!eligibleOnly || p.eligible) &&
            (interests.length === 0 || interests.includes(normalizeCategory(p.category))),
        )
        .sort(byEligibleThenLocal);
      const totalCount = all.length;
      const startIdx = (page - 1) * size;
      const items = all.slice(startIdx, startIdx + size);
      // 적격 정책의 추정 지원금 합산 (만원)
      const eligibleItems = all.filter((i) => i.eligible);
      const estimatedTotal = eligibleItems.reduce((s, i) => s + (i.amount ?? 0), 0);
      const estimatedCount = eligibleItems.filter((i) => i.amount !== null).length;
      // 카테고리별 추정 지원금 분해 (금액 내림차순)
      const byCategory = new Map<string, { total: number; count: number }>();
      for (const i of eligibleItems) {
        if (i.amount === null) continue;
        const key = normalizeCategory(i.category);
        const cur = byCategory.get(key) ?? { total: 0, count: 0 };
        cur.total += i.amount;
        cur.count += 1;
        byCategory.set(key, cur);
      }
      const categoryTotals = [...byCategory.entries()]
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.total - a.total);
      return NextResponse.json({
        items,
        totalCount,
        pageNum: page,
        pageSize: size,
        totalPages: Math.max(1, Math.ceil(totalCount / size)),
        eligibleCount: eligibleItems.length,
        estimatedTotal,
        estimatedCount,
        categoryTotals,
      });
    }

    const { policies, totalCount, pageNum, pageSize } = await fetchPolicies({
      pageNum: page,
      pageSize: size,
      ...filter,
    });

    const items = policies
      .map(annotate)
      .sort(byEligibleThenLocal);

    return NextResponse.json({
      items,
      totalCount,
      pageNum,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / (pageSize || size))),
      eligibleCount: items.filter((i) => i.eligible).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
