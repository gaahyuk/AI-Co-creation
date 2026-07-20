import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docCode: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: policyId, docCode } = await params;
    const body = await req.json();
    const { status } = body; // not_started | preparing | completed | uploaded

    // 정책 확인
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    // 서류 가이드 확인
    const docGuide = await prisma.documentGuide.findUnique({
      where: { code: docCode },
    });

    if (!docGuide) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 진행 상태 업데이트
    const progress = await prisma.userDocumentProgress.upsert({
      where: {
        userId_policyId_documentId: {
          userId: user.id,
          policyId,
          documentId: docGuide.id,
        },
      },
      update: {
        status,
        uploadedAt: status === "uploaded" ? new Date() : null,
      },
      create: {
        userId: user.id,
        policyId,
        documentId: docGuide.id,
        status,
        uploadedAt: status === "uploaded" ? new Date() : null,
      },
    });

    // 전체 진행 상태 조회
    const allProgress = await prisma.userDocumentProgress.findMany({
      where: {
        userId: user.id,
        policyId,
      },
    });

    const completed = allProgress.filter((p) => p.status === "completed" || p.status === "uploaded").length;
    const total = allProgress.length;

    return NextResponse.json({
      success: true,
      progress: {
        documentId: docGuide.id,
        documentTitle: docGuide.title,
        status: progress.status,
        completedAt: progress.uploadedAt,
      },
      summary: {
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error updating document status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
