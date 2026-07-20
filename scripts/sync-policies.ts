import "dotenv/config"; // tsx로 직접 실행하는 스크립트는 .env를 자동 로드하지 않으므로 명시적으로 읽는다.
import { prisma } from "@/lib/prisma";
import { syncPolicies } from "@/lib/policy-sync";

syncPolicies()
  .then((summary) => {
    console.log("정책 동기화 완료:", summary);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
