import { prisma } from "@/lib/prisma";
import { runDeadlineReminderCheck } from "@/lib/deadline-reminders";

runDeadlineReminderCheck()
  .then((summary) => {
    console.log("마감일 알림 체크 완료:", summary);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
