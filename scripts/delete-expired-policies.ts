import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function deleteExpiredPolicies() {
  console.log("🔍 마감된 정책 검색 중...\n");

  // 오늘 자정 기준
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // applyEnd가 오늘보다 이전인 정책 찾기
  const expiredPolicies = await prisma.policy.findMany({
    where: {
      applyEnd: {
        lt: today,
      },
    },
    select: {
      id: true,
      title: true,
      applyEnd: true,
      sourceSystem: true,
    },
  });

  console.log(`📊 마감된 정책 현황:`);
  console.log(`총 ${expiredPolicies.length}건 발견\n`);

  if (expiredPolicies.length === 0) {
    console.log("✓ 마감된 정책이 없습니다.");
    await prisma.$disconnect();
    return;
  }

  // 마감된 정책 목록 출력
  console.log("📋 삭제할 정책 목록:");
  console.log("─".repeat(80));

  const expiredBySource: Record<string, number> = {};

  expiredPolicies.forEach((p, idx) => {
    const endDate = new Date(p.applyEnd!);
    const daysAgo = Math.floor(
      (new Date().getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(
      `${idx + 1}. [${p.sourceSystem}] ${p.title}`
    );
    console.log(
      `   마감일: ${endDate.toLocaleDateString("ko-KR")} (${daysAgo}일 전)`
    );

    expiredBySource[p.sourceSystem] = (expiredBySource[p.sourceSystem] || 0) + 1;
  });

  console.log("─".repeat(80));
  console.log();

  // 통계
  console.log("📈 출처별 마감 정책:");
  Object.entries(expiredBySource).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}건`);
  });
  console.log();

  // 삭제 진행
  console.log("🗑️  정책 삭제 중...\n");

  // 해당 정책의 관련 데이터도 함께 삭제 (Cascade 설정되어 있음)
  const deleteResult = await prisma.policy.deleteMany({
    where: {
      applyEnd: {
        lt: today,
      },
    },
  });

  console.log(`✅ 삭제 완료!`);
  console.log();
  console.log("📊 결과:");
  console.log(`- 삭제된 정책: ${deleteResult.count}건`);
  console.log();

  // 삭제 후 전체 정책 수 확인
  const totalPolicies = await prisma.policy.count();
  const activePolicies = await prisma.policy.count({
    where: {
      applyEnd: {
        gte: today,
      },
    },
  });

  console.log("📋 삭제 후 정책 현황:");
  console.log(`- 전체 정책: ${totalPolicies}건`);
  console.log(`- 활성 정책 (신청 가능): ${activePolicies}건`);
  console.log(`- 마감된 정책: ${totalPolicies - activePolicies}건`);
  console.log();

  console.log("✨ 모든 마감된 정책이 삭제되었습니다!");
}

deleteExpiredPolicies()
  .catch((err) => {
    console.error("❌ 오류 발생:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
