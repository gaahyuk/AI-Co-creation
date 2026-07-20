import "dotenv/config";
import { prisma } from "@/lib/prisma";

const DEAD_URLS = ["www.meplex.co.kr", "www.work.go.kr"];

async function removeDeadPolicies() {
  console.log("🔍 종료된 사이트 정책 검색 중...");

  for (const deadUrl of DEAD_URLS) {
    const policies = await prisma.policy.findMany({
      where: {
        applyUrl: {
          contains: deadUrl,
        },
      },
    });

    console.log(`\n${deadUrl}로 등록된 정책: ${policies.length}건`);

    if (policies.length > 0) {
      policies.forEach((p) => {
        console.log(`  - [${p.sourceSystem}] ${p.title} (${p.applyUrl})`);
      });

      // applyUrl을 null로 업데이트
      const updated = await prisma.policy.updateMany({
        where: {
          applyUrl: {
            contains: deadUrl,
          },
        },
        data: {
          applyUrl: null,
        },
      });

      console.log(`  ✓ ${updated.count}건 URL 제거됨`);
    }
  }

  console.log("\n✅ 완료");
}

removeDeadPolicies()
  .catch((err) => {
    console.error("❌ 에러:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
