import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function createAssetTestData() {
  console.log("자산 형성 테스트 데이터 생성 중...\n");

  // 1. 기본 정책 생성
  const policy = await prisma.policy.create({
    data: {
      sourceSystem: "manual_local",
      sourceId: `test-${Date.now()}`,
      title: "청년내일저축계좌 - 테스트",
      category: "자산형성",
      description: "청년의 자산형성을 지원하는 정부 정책입니다",
      supportContent: "월 10만원 이상 저축 시 정부가 월 10만원을 지원합니다",
      requiredDocsText: "신분증, 통장사본",
      applyUrl: "https://www.onyouth.go.kr",
      provisionInstName: "청년정책 관리단",
    },
  });

  console.log(`✓ 정책 생성: ${policy.title}`);

  // 2. 자산 형성 정책 생성
  const assetPolicy = await prisma.assetFormationPolicy.create({
    data: {
      policyId: policy.id,
      category: "savings_account",
      monthlyContribution: 100_000,
      governmentSupport: 100_000,
      term: 48,
      maxBenefit: 5_000_000,
    },
  });

  console.log(`✓ 자산 형성 정책 생성 완료`);
  console.log(`  - 월 저축: 10만원`);
  console.log(`  - 정부 지원: 월 10만원`);
  console.log(`  - 기간: ${assetPolicy.term}개월`);
  console.log(`  - 최대 지원금: 500만원\n`);

  console.log("✨ 테스트 데이터 생성 완료!");
  console.log("이제 자산 형성 페이지에서 시뮬레이터를 사용할 수 있습니다.");
}

createAssetTestData()
  .catch((err) => {
    console.error("❌ 오류:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
