import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function seedPolicyTimings() {
  console.log("📅 정책 타이밍 데이터 준비 중...\n");

  // 정책별 타이밍 설정
  const policyTimings = [
    {
      titleKeyword: "국가장학금",
      timings: [
        { season: "semester_start", optimalMonth: 3, description: "봄 학기 시작 시 신청" },
        { season: "semester_start", optimalMonth: 9, description: "가을 학기 시작 시 신청" },
      ],
    },
    {
      titleKeyword: "청년내일저축계좌",
      timings: [
        { season: "all_year", optimalMonth: null, description: "연중 상시 모집" },
      ],
    },
    {
      titleKeyword: "청년월세",
      timings: [
        { season: "all_year", optimalMonth: null, description: "연중 상시 모집" },
      ],
    },
    {
      titleKeyword: "청년인턴",
      timings: [
        { season: "summer", optimalMonth: 6, description: "여름방학 인턴십 신청" },
        { season: "winter", optimalMonth: 12, description: "겨울방학 인턴십 신청" },
      ],
    },
  ];

  // 각 정책별로 타이밍 정보 추가
  for (const policyTiming of policyTimings) {
    const policy = await prisma.policy.findFirst({
      where: {
        title: { contains: policyTiming.titleKeyword },
      },
    });

    if (policy) {
      for (const timing of policyTiming.timings) {
        await prisma.policyTiming.upsert({
          where: {
            policyId_season: {
              policyId: policy.id,
              season: timing.season,
            },
          },
          update: {
            optimalMonth: timing.optimalMonth,
            description: timing.description,
          },
          create: {
            policyId: policy.id,
            season: timing.season,
            optimalMonth: timing.optimalMonth,
            description: timing.description,
          },
        });
      }
      console.log(`✓ "${policy.title}" 타이밍 정보 추가 (${policyTiming.timings.length}개)`);
    }
  }

  console.log("\n✨ 정책 타이밍 데이터 생성 완료!");
}

seedPolicyTimings()
  .catch((err) => {
    console.error("❌ 오류:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
