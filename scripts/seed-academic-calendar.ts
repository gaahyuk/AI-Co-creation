import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function seedAcademicCalendar() {
  console.log("🎓 학사 일정 데이터 준비 중...\n");

  const currentYear = new Date().getFullYear();

  const academicSchedules = [
    {
      year: currentYear,
      semester: 1,
      startDate: new Date(currentYear, 2, 1), // 3월 1일
      endDate: new Date(currentYear, 6, 31), // 7월 31일
      vacationStart: new Date(currentYear, 6, 1), // 7월 1일
      vacationEnd: new Date(currentYear, 8, 1), // 9월 1일
      events: {
        수강신청: "3월 15일 - 3월 20일",
        수강신청정정기간: "3월 21일 - 3월 27일",
        추가정정기간: "4월 1일 - 4월 7일",
      },
    },
    {
      year: currentYear,
      semester: 2,
      startDate: new Date(currentYear, 8, 1), // 9월 1일
      endDate: new Date(currentYear, 11, 31), // 12월 31일
      vacationStart: new Date(currentYear + 1, 0, 1), // 1월 1일
      vacationEnd: new Date(currentYear + 1, 2, 1), // 3월 1일
      events: {
        수강신청: "8월 15일 - 8월 20일",
        수강신청정정기간: "8월 21일 - 8월 27일",
        추가정정기간: "9월 1일 - 9월 7일",
      },
    },
  ];

  for (const schedule of academicSchedules) {
    const existing = await prisma.academicCalendar.findUnique({
      where: {
        year_semester: {
          year: schedule.year,
          semester: schedule.semester,
        },
      },
    });

    if (!existing) {
      await prisma.academicCalendar.create({
        data: {
          year: schedule.year,
          semester: schedule.semester,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          vacationStart: schedule.vacationStart,
          vacationEnd: schedule.vacationEnd,
          events: schedule.events,
        },
      });
      console.log(
        `✓ ${schedule.year}년 ${schedule.semester}학기 학사 일정 추가`
      );
    }
  }

  console.log("\n✨ 학사 일정 데이터 생성 완료!");
}

seedAcademicCalendar()
  .catch((err) => {
    console.error("❌ 오류:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
