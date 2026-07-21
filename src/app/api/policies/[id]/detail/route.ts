import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

// 정책 소개/지원내용/제출서류 원문은 텍스트 용량이 커서 목록 페이로드에 담지 않고,
// 카드 상세를 펼칠 때만 지연 조회한다.
export async function GET(_req: Request, props: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response(null, { status: 401 });
    }

    const { id: policyId } = await props.params;
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { description: true, supportContent: true, requiredDocsText: true },
    });
    if (!policy) {
      return new Response(null, { status: 404 });
    }

    return Response.json({
      description: policy.description,
      supportContent: policy.supportContent,
      docsText: policy.requiredDocsText,
    });
  } catch (error) {
    console.error("[detail route error]", error);
    return Response.json({ error: "데이터를 불러올 수 없습니다" }, { status: 500 });
  }
}
