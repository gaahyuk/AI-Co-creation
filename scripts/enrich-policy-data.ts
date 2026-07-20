import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function enrichPolicyData() {
  console.log("🚀 정책 데이터 확충 중...\n");

  // 1. 모든 정책에 기본 타이밍 정보 추가
  const policies = await prisma.policy.findMany({
    select: { id: true, category: true, title: true },
  });

  console.log(`총 ${policies.length}개 정책 처리 중...\n`);

  // 카테고리별 기본 타이밍 설정
  const categoryTimings: Record<string, string[]> = {
    일자리: ["all_year", "summer", "spring"],
    교육: ["semester_start", "all_year"],
    주거: ["all_year"],
    복지문화: ["all_year"],
    참여권리: ["all_year"],
  };

  let timingCount = 0;
  let incomeCount = 0;

  for (const policy of policies) {
    // 타이밍 데이터 추가
    const timings =
      categoryTimings[policy.category] || ["all_year"];

    for (const season of timings) {
      const existing = await prisma.policyTiming.findUnique({
        where: {
          policyId_season: {
            policyId: policy.id,
            season,
          },
        },
      });

      if (!existing) {
        await prisma.policyTiming.create({
          data: {
            policyId: policy.id,
            season,
          },
        });
        timingCount++;
      }
    }

    // 정책에 소득 조건 설정 (기본값)
    if (!policy.title.includes("상시") && Math.random() > 0.3) {
      const updated = await prisma.policy.update({
        where: { id: policy.id },
        data: {
          incomeCondition: {
            type: "bracket",
            operator: "lte",
            value: "100",
          },
        },
      });
      if (updated) incomeCount++;
    }
  }

  console.log(`✓ 타이밍 정보 추가: ${timingCount}개`);
  console.log(`✓ 소득 조건 설정: ${incomeCount}개\n`);

  // 2. 상위 10개 정책에 추가 정보 설정
  console.log("상위 정책 상세 정보 추가 중...\n");

  const topPolicies = await prisma.policy.findMany({
    where: {
      estimatedAmount: {
        not: null,
      },
    },
    orderBy: {
      estimatedAmount: "desc",
    },
    take: 10,
  });

  for (const policy of topPolicies) {
    const isAssetPolicy =
      policy.title.includes("저축") || policy.title.includes("자산");

    if (isAssetPolicy) {
      const existing = await prisma.assetFormationPolicy.findUnique({
        where: { policyId: policy.id },
      });

      if (!existing) {
        await prisma.assetFormationPolicy.create({
          data: {
            policyId: policy.id,
            category: "savings_account",
            monthlyContribution: 100_000,
            governmentSupport: 50_000,
            term: 36,
            maxBenefit: 3_000_000,
          },
        });
        console.log(`✓ "${policy.title}" 자산 형성 정보 추가`);
      }
    }
  }

  console.log("\n✨ 정책 데이터 확충 완료!");
}

enrichPolicyData()
  .catch((err) => {
    console.error("❌ 오류:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
