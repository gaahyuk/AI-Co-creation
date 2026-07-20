import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateMatch } from "@/lib/matching-engine";
import { docTypeName, regionName, URGENT_TIP_TYPES } from "@/lib/constants";
import {
  PoliciesView,
  type CategorySummary,
  type PolicyCard,
} from "./policies-view";

// 정책 지역코드(법정동 앞 2자리, 2026 개편 공식 코드) → 표시용 짧은 지역명.
const REGION_SHORT: Record<string, string> = {
  "11": "서울", "12": "광주·전남", "26": "부산", "27": "대구", "28": "인천",
  "30": "대전", "31": "울산", "36": "세종", "41": "경기", "43": "충북",
  "44": "충남", "47": "경북", "48": "경남", "50": "제주", "51": "강원",
  "52": "전북",
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function regionLabelFromCodes(value: unknown): string {
  const codes = asStringArray(value);
  if (codes.length === 0) return "전국";
  const names = [...new Set(codes.map((c) => REGION_SHORT[c]).filter(Boolean))];
  if (names.length === 0) return "전국";
  if (names.length === 1) return names[0];
  return `${names[0]} 외 ${names.length - 1}곳`;
}

// 온통청년 정책은 sourceId가 정책번호(plcyNo)라 공식 상세페이지를 만들 수 있다.
// 신청 URL이 따로 없어도 이 링크로 신청방법을 확인할 수 있다.
function detailUrlFor(sourceSystem: string, sourceId: string): string | null {
  if (sourceSystem === "youth_center") {
    return `https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch/ythPlcyDetail/${sourceId}`;
  }
  return null;
}

function ddayLabel(end: Date | null): PolicyCard["dday"] {
  if (!end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const diff = Math.round((endDay.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return { label: "마감", urgent: false };
  return { label: `D-${diff}`, urgent: diff <= 7 };
}

export default async function PoliciesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile || !profile.regionCode) redirect("/profile");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [policies, trackings, documents, urgentTipGroups] = await Promise.all([
    prisma.policy.findMany({ include: { requiredDocuments: true }, orderBy: { title: "asc" } }),
    prisma.userPolicyTracking.findMany({ where: { userId: session.user.id } }),
    prisma.document.findMany({ where: { userId: session.user.id } }),
    prisma.policyTip.groupBy({
      by: ["policyId"],
      where: { tipType: { in: [...URGENT_TIP_TYPES] }, createdAt: { gte: oneDayAgo } },
      _count: { _all: true },
    }),
  ]);

  const interestedIds = new Set(trackings.map((t) => t.policyId));
  const ownedDocTypes = new Set(
    documents.filter((d) => d.docType != null).map((d) => d.docType as string)
  );
  const urgentTipCount = new Map(urgentTipGroups.map((g) => [g.policyId, g._count._all]));

  const cards: PolicyCard[] = policies.map((p) => {
    const outcome = evaluateMatch(profile, p);
    return {
      id: p.id,
      category: p.category,
      title: p.title,
      amount: p.estimatedAmount ?? null,
      org: p.provisionInstName ?? null,
      regionLabel: regionLabelFromCodes(p.regionCodes),
      dday: ddayLabel(p.applyEnd),
      applyEndAt: p.applyEnd ? p.applyEnd.getTime() : null,
      hasApplyUrl: !!p.applyUrl,
      applyUrl: p.applyUrl ?? null,
      detailUrl: detailUrlFor(p.sourceSystem, p.sourceId),
      keywords: (p.keywords ?? "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      tier: outcome.tier,
      interested: interestedIds.has(p.id),
      reasons: outcome.reasons,
      docs: p.requiredDocuments.map((d) => ({
        name: docTypeName(d.docType),
        owned: ownedDocTypes.has(d.docType),
      })),
      urgentTipCount: urgentTipCount.get(p.id) ?? 0,
    };
  });

  // 요약: 매칭된(미충족 제외) 정책 기준. 금액은 '금액 확인된' 정책만 합산해 추정치로 제시.
  const matched = cards.filter((c) => c.tier !== "excluded");
  const withAmount = matched.filter((c) => c.amount != null);
  const totalAmount = withAmount.reduce((sum, c) => sum + (c.amount ?? 0), 0);

  const byCatMap = new Map<string, { count: number; amount: number }>();
  for (const c of withAmount) {
    const entry = byCatMap.get(c.category) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += c.amount ?? 0;
    byCatMap.set(c.category, entry);
  }
  const byCategory: CategorySummary[] = [...byCatMap.entries()]
    .map(([category, v]) => ({ category, count: v.count, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount);

  const summary = {
    regionLabel: regionName(profile.regionCode),
    matchedCount: matched.length,
    amountConfirmedCount: withAmount.length,
    totalAmount,
    byCategory,
  };

  return (
    <div className="min-h-full bg-slate-50">
      <PoliciesView summary={summary} cards={cards} />
    </div>
  );
}
