import { NextRequest, NextResponse } from "next/server";
import { fetchPolicyById } from "@/lib/youth/client";
import { evaluateEligibility, daysUntil, isDirectApply, regionScope } from "@/lib/youth/eligibility";
import { extractAmount } from "@/lib/youth/money";
import type { UserProfile } from "@/lib/youth/types";

/**
 * GET /api/policies/[plcyNo]
 * 단건 정책 상세 + (프로필 제공 시) 자격 체크리스트 반환.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plcyNo: string }> },
) {
  const { plcyNo } = await params;
  const sp = req.nextUrl.searchParams;

  const profile: UserProfile = {
    age: sp.get("age") ? Number(sp.get("age")) : undefined,
    regionCode: sp.get("regionCode") ?? sp.get("sido") ?? undefined,
    jobCode: sp.get("jobCode") ?? undefined,
    income: sp.get("income") ? Number(sp.get("income")) : undefined,
  };

  try {
    const policy = await fetchPolicyById(plcyNo);
    if (!policy) {
      return NextResponse.json({ error: "정책을 찾을 수 없습니다." }, { status: 404 });
    }
    const { eligible, checks } = evaluateEligibility(policy, profile);
    const dDay = daysUntil(policy.periodEnd);
    const expired = dDay !== null && dDay < 0;
    if (expired) {
      checks.push({ label: "신청기간", passed: false, detail: `${policy.periodEnd} 마감됨` });
    }
    const fullMatch =
      !expired && checks.length > 0 && checks.every((c) => c.passed === true);
    return NextResponse.json({
      ...policy,
      eligible: eligible && !expired,
      fullMatch,
      checks,
      dDay,
      directApply: isDirectApply(policy),
      amount: extractAmount(policy),
      regionScope: regionScope(policy, profile.regionCode),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
