import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIP_TYPES } from "@/lib/constants";

const TIP_TYPE_CODES = TIP_TYPES.map((t) => t.code);
const RATE_LIMIT_MS = 20 * 1000;

const CreateTipSchema = z.object({
  content: z.string().trim().min(1).max(200),
  tipType: z.enum(TIP_TYPE_CODES as [string, ...string[]]),
});

// 익명 제보 목록: 작성자(userId)는 절대 응답에 포함하지 않는다.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/policies/[id]/tips">
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(null, { status: 401 });
  }

  const { id: policyId } = await ctx.params;
  const tips = await prisma.policyTip.findMany({
    where: { policyId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, content: true, tipType: true, createdAt: true },
  });

  return Response.json({ tips });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/policies/[id]/tips">
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(null, { status: 401 });
  }

  const { id: policyId } = await ctx.params;
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) {
    return new Response(null, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateTipSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "제보 내용을 1~200자로 입력해주세요." }, { status: 400 });
  }

  const recent = await prisma.policyTip.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < RATE_LIMIT_MS) {
    return Response.json(
      { error: "너무 빠르게 연속으로 제보하고 있어요. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  const tip = await prisma.policyTip.create({
    data: {
      policyId,
      userId: session.user.id,
      content: parsed.data.content,
      tipType: parsed.data.tipType,
    },
    select: { id: true, content: true, tipType: true, createdAt: true },
  });

  return Response.json({ tip }, { status: 201 });
}
