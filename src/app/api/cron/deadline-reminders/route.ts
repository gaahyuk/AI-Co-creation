import { runDeadlineReminderCheck } from "@/lib/deadline-reminders";

// 운영 배포 후 외부 크론(예: Vercel Cron, GitHub Actions schedule)이
// `Authorization: Bearer ${CRON_SECRET}` 헤더로 이 라우트를 주기적으로 호출하도록 연결한다.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return new Response(null, { status: 401 });
    }
  }

  const summary = await runDeadlineReminderCheck();
  return Response.json(summary);
}
