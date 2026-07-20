import { prisma } from "@/lib/prisma";
import { getYouthCenterClient, getSubsidy24Client } from "@/lib/adapters";
import { normalizeYouthCenter, normalizeSubsidy24 } from "@/lib/adapters/normalize";
import type { NormalizedPolicy, PolicySourceClient, RawPolicyRecord } from "@/lib/adapters/types";

export interface PolicySyncSummary {
  fetched: number;
  saved: number;
  failed: number;
}

async function upsertPolicy(policy: NormalizedPolicy) {
  const saved = await prisma.policy.upsert({
    where: {
      sourceSystem_sourceId: { sourceSystem: policy.sourceSystem, sourceId: policy.sourceId },
    },
    update: {
      title: policy.title,
      category: policy.category,
      ageMin: policy.ageMin,
      ageMax: policy.ageMax,
      regionCodes: policy.regionCodes ?? undefined,
      jobStatusCodes: policy.jobStatusCodes ?? undefined,
      incomeCondition: policy.incomeCondition ?? undefined,
      rawConditionText: policy.rawConditionText,
      description: policy.description,
      supportContent: policy.supportContent,
      requiredDocsText: policy.requiredDocsText,
      provisionInstName: policy.provisionInstName,
      keywords: policy.keywords,
      estimatedAmount: policy.estimatedAmount,
      conditionsVerified: policy.conditionsVerified,
      applyStart: policy.applyStart,
      applyEnd: policy.applyEnd,
      applyUrl: policy.applyUrl,
      syncedAt: new Date(),
    },
    create: {
      sourceSystem: policy.sourceSystem,
      sourceId: policy.sourceId,
      title: policy.title,
      category: policy.category,
      ageMin: policy.ageMin,
      ageMax: policy.ageMax,
      regionCodes: policy.regionCodes ?? undefined,
      jobStatusCodes: policy.jobStatusCodes ?? undefined,
      incomeCondition: policy.incomeCondition ?? undefined,
      rawConditionText: policy.rawConditionText,
      description: policy.description,
      supportContent: policy.supportContent,
      requiredDocsText: policy.requiredDocsText,
      provisionInstName: policy.provisionInstName,
      keywords: policy.keywords,
      estimatedAmount: policy.estimatedAmount,
      conditionsVerified: policy.conditionsVerified,
      applyStart: policy.applyStart,
      applyEnd: policy.applyEnd,
      applyUrl: policy.applyUrl,
    },
  });

  await prisma.policyRequiredDocument.deleteMany({ where: { policyId: saved.id } });
  if (policy.requiredDocTypes.length > 0) {
    await prisma.policyRequiredDocument.createMany({
      data: policy.requiredDocTypes.map((docType) => ({
        policyId: saved.id,
        docType,
        isRequired: true,
      })),
    });
  }

  return saved;
}

// 클라이언트가 빈 페이지를 줄 때까지 순차적으로 모든 페이지를 모은다.
// (mock은 page 1만 채우고 이후 []를 주므로 동일 로직으로 동작한다.)
async function fetchAllPages(
  client: PolicySourceClient,
  maxPages = 100
): Promise<RawPolicyRecord[]> {
  const all: RawPolicyRecord[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const batch = await client.fetchPolicies({ page });
    if (batch.length === 0) break;
    all.push(...batch);
  }
  return all;
}

// 온통청년/보조금24 정책을 전 페이지 수집해 DB에 반영한다.
// seed 스크립트와 cron 라우트(/api/cron/sync-policies)가 공유하는 단일 동기화 로직이다.
export async function syncPolicies(): Promise<PolicySyncSummary> {
  try {
    const youthCenter = getYouthCenterClient();
    const subsidy24 = getSubsidy24Client();

    let youthRaw: RawPolicyRecord[] = [];
    let subsidyRaw: RawPolicyRecord[] = [];

    try {
      youthRaw = await fetchAllPages(youthCenter);
      console.log(`[policy-sync] 온통청년 ${youthRaw.length}건 수집`);
    } catch (err) {
      console.error("[policy-sync] 온통청년 수집 실패:", err);
    }

    try {
      subsidyRaw = await fetchAllPages(subsidy24);
      console.log(`[policy-sync] 보조금24 ${subsidyRaw.length}건 수집`);
    } catch (err) {
      console.error("[policy-sync] 보조금24 수집 실패:", err);
    }

    const normalized = [
      ...youthRaw.map(normalizeYouthCenter),
      ...subsidyRaw.map(normalizeSubsidy24),
    ];

    let saved = 0;
    let failed = 0;
    for (const policy of normalized) {
      try {
        await upsertPolicy(policy);
        saved++;
      } catch (err) {
        failed++;
        console.error(`[policy-sync] 저장 실패: ${policy.sourceSystem}/${policy.sourceId}`, err);
      }
    }

    console.log(`[policy-sync] 완료: 수집=${normalized.length}, 저장=${saved}, 실패=${failed}`);
    return { fetched: normalized.length, saved, failed };
  } catch (err) {
    console.error("[policy-sync] 치명적 에러:", err);
    throw err;
  }
}
