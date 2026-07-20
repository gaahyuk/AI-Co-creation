import { syncPolicies } from "@/lib/policy-sync";

// 운영 배포 후 외부 크론(예: Vercel Cron, GitHub Actions schedule)이
// `Authorization: Bearer ${CRON_SECRET}` 헤더로 이 라우트를 주기적으로 호출해
// 온통청년/보조금24 정책을 재동기화하도록 연결한다.
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${secret}`) {
        return new Response(null, { status: 401 });
      }
    }

    const summary = await syncPolicies();
    return Response.json(summary);
  } catch (error) {
    console.error("[cron sync-policies error]", error);
    return Response.json(
      { error: "정책 동기화 실패", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
