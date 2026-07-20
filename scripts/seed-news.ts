import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function seedNews() {
  console.log("📰 정책 뉴스 데이터 준비 중...\n");

  const newsItems = [
    {
      title: "2024년 청년내일저축계좌 신청 기간 연장",
      content: "정부는 청년내일저축계좌의 신청 기간을 6개월 더 연장하기로 결정했습니다. 더 많은 청년들이 자산을 형성할 수 있는 기회를 제공하기 위함입니다.",
      source: "온통청년",
      category: "자산형성",
      url: "https://www.youthcenter.go.kr",
    },
    {
      title: "청년월세지원 신청자격 완화",
      source: "온통청년",
      category: "주거",
      content: "기존에는 월세 15만원 이상이어야 했으나, 앞으로 10만원 이상에서도 신청할 수 있습니다.",
      url: "https://www.youthcenter.go.kr",
    },
    {
      title: "2025년 청년 일자리 정책 강화",
      content: "정부는 청년 일자리 창출을 위해 내년 예산을 30% 증액하기로 발표했습니다. 신규 기업 지원과 전직 교육 프로그램이 확대됩니다.",
      source: "온통청년",
      category: "일자리",
      url: "https://www.youthcenter.go.kr",
    },
    {
      title: "국가장학금 2학기 모집 시작",
      content: "2024학년도 2학기 국가장학금 신청이 시작되었습니다. 온라인 신청만 가능하며, 서류 제출 기한은 7월 31일입니다.",
      source: "한국장학재단",
      category: "교육",
      url: "https://www.kosaf.go.kr",
    },
    {
      title: "지역별 청년정책 신규 공모",
      content: "전국 시도에서 청년을 위한 특화된 정책들을 새로 공모하고 있습니다. 거주 지역의 정책을 꼭 확인해보세요.",
      source: "온통청년",
      category: "전체",
      url: "https://www.youthcenter.go.kr",
    },
  ];

  for (const news of newsItems) {
    const existing = await prisma.policyNews.findFirst({
      where: { title: news.title },
    });

    if (!existing) {
      await prisma.policyNews.create({
        data: {
          title: news.title,
          content: news.content,
          source: news.source,
          category: news.category,
          url: news.url,
        },
      });
      console.log(`✓ "${news.title}" 뉴스 추가`);
    }
  }

  console.log("\n✨ 정책 뉴스 데이터 생성 완료!");
}

seedNews()
  .catch((err) => {
    console.error("❌ 오류:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
