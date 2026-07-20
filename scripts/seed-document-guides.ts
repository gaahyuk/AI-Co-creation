import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function seedDocumentGuides() {
  console.log("📋 서류 가이드 데이터 준비 중...\n");

  // 1. 서류 가이드 생성
  const documentGuides = [
    {
      code: "resident_registration",
      title: "주민등록등본",
      description: "거주지역, 가족관계 확인용",
      steps: JSON.stringify([
        "주민센터 방문 또는 정부24 온라인 신청",
        "신분증 지참",
        "수수료 1,000원",
        "즉시 발급",
      ]),
      issuePlaces: JSON.stringify([
        {
          name: "주민센터 (읍면동)",
          address: "거주지 관할 주민센터",
          phone: "1588-7776",
        },
        {
          name: "정부24",
          address: "www.gov.kr",
          phone: "02-2100-8822",
        },
      ]),
      fee: 1000,
      processingDay: 0,
    },
    {
      code: "income_certificate",
      title: "소득분위 증명서",
      description: "중위소득 기준 소득 확인용",
      steps: JSON.stringify([
        "건강보험공단 방문 또는 온라인",
        "신분증/건강보험증 지참",
        "수수료 무료",
        "5-10분 내 발급",
      ]),
      issuePlaces: JSON.stringify([
        {
          name: "국민건강보험공단",
          address: "www.nhis.or.kr",
          phone: "1577-1000",
        },
      ]),
      fee: 0,
      processingDay: 0,
    },
    {
      code: "bank_account_statement",
      title: "통장사본",
      description: "자산 및 거래 내역 확인용",
      steps: JSON.stringify([
        "은행 방문 또는 ATM",
        "통장과 신분증 지참",
        "ATM에서 자동 발급",
        "또는 창구에서 요청",
      ]),
      issuePlaces: JSON.stringify([
        {
          name: "해당 은행 점포",
          address: "거주지 근처 은행",
          phone: "각 은행 고객센터",
        },
      ]),
      fee: 0,
      processingDay: 0,
    },
    {
      code: "student_id",
      title: "학생증",
      description: "학생 신분 확인용",
      steps: JSON.stringify([
        "대학교 학사관리 시스템에서 신청",
        "또는 대학 학사관리팀 방문",
        "수수료 무료",
        "당일~3일 발급",
      ]),
      issuePlaces: JSON.stringify([
        {
          name: "재학 대학 학사관리팀",
          address: "대학 캠퍼스 내",
          phone: "각 대학 대표번호",
        },
      ]),
      fee: 0,
      processingDay: 3,
    },
    {
      code: "employment_certificate",
      title: "재직증명서",
      description: "현재 고용 상태 확인용",
      steps: JSON.stringify([
        "회사 인사팀에 요청",
        "또는 정부24에서 발급",
        "수수료 무료",
        "1-2일 내 발급",
      ]),
      issuePlaces: JSON.stringify([
        {
          name: "재직 회사",
          address: "회사 인사팀",
          phone: "회사 직통",
        },
        {
          name: "정부24",
          address: "www.gov.kr",
          phone: "02-2100-8822",
        },
      ]),
      fee: 0,
      processingDay: 1,
    },
    {
      code: "family_relation",
      title: "가족관계증명서",
      description: "부양가족 확인용",
      steps: JSON.stringify([
        "대법원 인터넷등기소 또는 주민센터",
        "신분증 지참",
        "수수료 1,000원",
        "즉시 발급",
      ]),
      issuePlaces: JSON.stringify([
        {
          name: "대법원 인터넷등기소",
          address: "www.iros.go.kr",
          phone: "1588-1234",
        },
        {
          name: "주민센터",
          address: "거주지 관할 주민센터",
          phone: "1588-7776",
        },
      ]),
      fee: 1000,
      processingDay: 0,
    },
  ];

  // 서류 가이드 생성
  console.log("✓ 서류 가이드 생성 중...");
  for (const guide of documentGuides) {
    await prisma.documentGuide.upsert({
      where: { code: guide.code },
      update: {},
      create: {
        code: guide.code,
        title: guide.title,
        description: guide.description,
        steps: guide.steps,
        issuePlaces: guide.issuePlaces,
        fee: guide.fee,
        processingDay: guide.processingDay,
      },
    });
  }

  console.log(`✓ ${documentGuides.length}개 서류 가이드 생성 완료\n`);

  // 2. 정책에 서류 연결
  console.log("✓ 정책에 서류 연결 중...");

  // 국가장학금 - 필요 서류
  const nationalScholarship = await prisma.policy.findFirst({
    where: { title: { contains: "국가장학금" } },
  });

  if (nationalScholarship) {
    const docs = ["student_id", "income_certificate", "family_relation"];
    for (const docCode of docs) {
      const doc = await prisma.documentGuide.findUnique({
        where: { code: docCode },
      });
      if (doc) {
        await prisma.policyDocumentGuide.upsert({
          where: {
            policyId_documentId: {
              policyId: nationalScholarship.id,
              documentId: doc.id,
            },
          },
          update: {},
          create: {
            policyId: nationalScholarship.id,
            documentId: doc.id,
            isRequired: true,
          },
        });
      }
    }
    console.log(`  • 국가장학금: 3개 서류 연결`);
  }

  // 청년내일저축계좌 - 필요 서류
  const savingsAccount = await prisma.policy.findFirst({
    where: { title: { contains: "청년내일저축계좌" } },
  });

  if (savingsAccount) {
    const docs = ["resident_registration", "income_certificate", "bank_account_statement"];
    for (const docCode of docs) {
      const doc = await prisma.documentGuide.findUnique({
        where: { code: docCode },
      });
      if (doc) {
        await prisma.policyDocumentGuide.upsert({
          where: {
            policyId_documentId: {
              policyId: savingsAccount.id,
              documentId: doc.id,
            },
          },
          update: {},
          create: {
            policyId: savingsAccount.id,
            documentId: doc.id,
            isRequired: true,
          },
        });
      }
    }
    console.log(`  • 청년내일저축계좌: 3개 서류 연결`);
  }

  // 청년월세 지원 - 필요 서류
  const rentSupport = await prisma.policy.findFirst({
    where: { title: { contains: "청년월세" } },
  });

  if (rentSupport) {
    const docs = ["resident_registration", "income_certificate"];
    for (const docCode of docs) {
      const doc = await prisma.documentGuide.findUnique({
        where: { code: docCode },
      });
      if (doc) {
        await prisma.policyDocumentGuide.upsert({
          where: {
            policyId_documentId: {
              policyId: rentSupport.id,
              documentId: doc.id,
            },
          },
          update: {},
          create: {
            policyId: rentSupport.id,
            documentId: doc.id,
            isRequired: true,
          },
        });
      }
    }
    console.log(`  • 청년월세 지원: 2개 서류 연결`);
  }

  // 청년인턴 - 필요 서류
  const internship = await prisma.policy.findFirst({
    where: { title: { contains: "인턴" } },
  });

  if (internship) {
    const docs = ["student_id", "resident_registration"];
    for (const docCode of docs) {
      const doc = await prisma.documentGuide.findUnique({
        where: { code: docCode },
      });
      if (doc) {
        await prisma.policyDocumentGuide.upsert({
          where: {
            policyId_documentId: {
              policyId: internship.id,
              documentId: doc.id,
            },
          },
          update: {},
          create: {
            policyId: internship.id,
            documentId: doc.id,
            isRequired: true,
          },
        });
      }
    }
    console.log(`  • 청년인턴: 2개 서류 연결`);
  }

  console.log("");
  console.log("✨ 서류 가이드 데이터 생성 완료!");
}

seedDocumentGuides()
  .catch((err) => {
    console.error("❌ 오류:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
