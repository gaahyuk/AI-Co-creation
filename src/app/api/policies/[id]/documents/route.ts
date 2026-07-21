import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: policyId } = await params;

    // 정책 확인
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // 해당 정책의 필요 서류 조회
    const documentGuides = await prisma.policyDocumentGuide.findMany({
      where: { policyId },
      include: {
        document: true,
      },
    });

    // 사용자의 서류 준비 상태 조회
    const userProgress = await prisma.userDocumentProgress.findMany({
      where: {
        userId: user.id,
        policyId,
      },
    });

    // 응답 데이터 포맷
    const documents = documentGuides.map((dg) => {
      const progress = userProgress.find((p) => p.documentId === dg.documentId);
      return {
        id: dg.document.id,
        code: dg.document.code,
        title: dg.document.title,
        description: dg.document.description,
        isRequired: dg.isRequired,
        policyGuide: dg.guide,
        steps: dg.document.steps,
        issuePlaces: dg.document.issuePlaces,
        fee: dg.document.fee,
        processingDay: dg.document.processingDay,
        status: progress?.status || "not_started",
        completedAt: progress?.uploadedAt,
      };
    });

    return NextResponse.json({
      policyId,
      policyTitle: policy.title,
      documents,
      summary: {
        total: documents.length,
        required: documents.filter((d) => d.isRequired).length,
        completed: documents.filter((d) => d.status === "completed").length,
      },
    });
  } catch (error) {
    console.error("Error fetching document guides:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
