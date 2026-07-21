import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

// GET: Q&A 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;

    const qna = await prisma.policyQnA.findMany({
      where: { policyId },
      select: {
        id: true,
        question: true,
        answer: true,
        votes: true,
        createdAt: true,
        user: {
          select: { email: true },
        },
      },
      orderBy: { votes: "desc" },
      take: 20,
    });

    return NextResponse.json({
      qna,
      count: qna.length,
    });
  } catch (error) {
    console.error("Error fetching Q&A:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 질문 추가
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: policyId } = await params;
    const body = await req.json();
    const { question } = body;

    if (!question || question.trim().length === 0 || question.length > 500) {
      return NextResponse.json(
        { error: "Invalid question" },
        { status: 400 }
      );
    }

    const qna = await prisma.policyQnA.create({
      data: {
        policyId,
        userId: user.id,
        question,
      },
    });

    return NextResponse.json({
      success: true,
      qna: {
        id: qna.id,
        question: qna.question,
        createdAt: qna.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating Q&A:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
