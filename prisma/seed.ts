import "dotenv/config"; // tsx로 실행되는 스크립트는 .env를 자동 로드하지 않으므로 명시적으로 읽는다.
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { syncPolicies } from "@/lib/policy-sync";

async function seedPolicies() {
  const summary = await syncPolicies();
  console.log(
    `정책 ${summary.fetched}건 중 ${summary.saved}건 시딩 완료 (실패 ${summary.failed}건)`
  );
}

type SeedUser = {
  email: string;
  birthDate: string;
  regionCode: string;
  jobStatus: string;
  incomeBracket: string;
  major?: string;
};

const SEED_USERS: SeedUser[] = [
  {
    email: "test1@example.com",
    birthDate: "2002-05-10", // 24세 전후, 서울, 미취업, 저소득
    regionCode: "11",
    jobStatus: "unemployed",
    incomeBracket: "100_or_less",
  },
  {
    email: "test2@example.com",
    birthDate: "1996-02-20", // 30세 전후, 경기, 재직중
    regionCode: "41",
    jobStatus: "employed",
    incomeBracket: "150_or_less",
  },
  {
    email: "test3@example.com",
    birthDate: "1981-08-01", // 45세 전후, 부산, 자영업, 소득 모름
    regionCode: "26",
    jobStatus: "self_employed",
    incomeBracket: "unknown",
  },
  {
    email: "test4@example.com",
    birthDate: "2006-11-15", // 20세 전후, 대전, 학생, 저소득
    regionCode: "30",
    jobStatus: "student",
    incomeBracket: "50_or_less",
  },
  {
    email: "test5@example.com",
    birthDate: "1966-03-03", // 60세 전후, 제주, 재직중, 고소득
    regionCode: "50",
    jobStatus: "employed",
    incomeBracket: "over_200",
  },
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash("test1234", 10);

  for (const seedUser of SEED_USERS) {
    const isAdmin = seedUser.email === "test1@example.com"; // 어드민 CSV 업로드 도구 테스트용
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: { isAdmin },
      create: { email: seedUser.email, passwordHash, provider: "credentials", isAdmin },
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        birthDate: new Date(seedUser.birthDate),
        regionCode: seedUser.regionCode,
        jobStatus: seedUser.jobStatus,
        incomeBracket: seedUser.incomeBracket,
      },
      create: {
        userId: user.id,
        birthDate: new Date(seedUser.birthDate),
        regionCode: seedUser.regionCode,
        jobStatus: seedUser.jobStatus,
        incomeBracket: seedUser.incomeBracket,
      },
    });
  }

  console.log(
    `테스트 사용자 ${SEED_USERS.length}명 시딩 완료 (비밀번호: test1234, test1@example.com은 관리자)`
  );
}

async function main() {
  await seedPolicies();
  await seedUsers();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
