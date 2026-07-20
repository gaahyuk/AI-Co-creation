import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function seedAssetFormationPolicies() {
  console.log("💰 자산 형성 정책 데이터 준비 중...\n");

  const assetPolicies = [
    {
      titleKeyword: "청년내일저축계좌",
      category: "savings_account",
      monthlyContribution: 100_000, // 월 10만원
      governmentSupport: 100_000, // 월 10만원
      term: 48, // 4년
      maxBenefit: 5_000_000, // 최대 500만원
    },
  ];

  for (const policyData of assetPolicies) {
    const policy = await prisma.policy.findFirst({
      where: {
        title: { contains: policyData.titleKeyword },
      },
    });

    if (policy) {
      const existing = await prisma.assetFormationPolicy.findUnique({
        where: { policyId: policy.id },
      });

      if (!existing) {
        await prisma.assetFormationPolicy.create({
          data: {
            policyId: policy.id,
            category: policyData.category,
            monthlyContribution: policyData.monthlyContribution,
            governmentSupport: policyData.governmentSupport,
            term: policyData.term,
            maxBenefit: policyData.maxBenefit,
          },
        });
        console.log(
          `✓ "${policy.title}" 자산 형성 정책 정보 추가`
        );
      }
    }
  }

  // 리워드 정보 생성
  console.log("\n🏆 리워드 데이터 준비 중...\n");

  const rewards = [
    {
      code: "first_policy_apply",
      name: "첫 정책 신청",
      description: "첫 정책을 신청했습니다",
      icon: "🚀",
      points: 100,
    },
    {
      code: "five_policies_applied",
      name: "5개 정책 신청",
      description: "5개의 정책을 신청했습니다",
      icon: "⭐",
      points: 500,
    },
    {
      code: "documents_prepared",
      name: "서류 준비 완료",
      description: "모든 필요 서류를 준비했습니다",
      icon: "📄",
      points: 200,
    },
    {
      code: "asset_formation_started",
      name: "자산 형성 시작",
      description: "자산 형성 정책을 시작했습니다",
      icon: "💎",
      points: 300,
    },
    {
      code: "joined_community",
      name: "커뮤니티 가입",
      description: "정책 커뮤니티에 가입했습니다",
      icon: "👥",
      points: 50,
    },
  ];

  for (const rewardData of rewards) {
    const existing = await prisma.reward.findUnique({
      where: { code: rewardData.code },
    });

    if (!existing) {
      await prisma.reward.create({
        data: rewardData,
      });
    }
  }

  console.log(`✓ ${rewards.length}개 리워드 생성 완료\n`);
  console.log("✨ 자산 형성 정책 및 리워드 데이터 생성 완료!");
}

seedAssetFormationPolicies()
  .catch((err) => {
    console.error("❌ 오류:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
