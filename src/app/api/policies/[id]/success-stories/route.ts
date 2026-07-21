import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

// GET: 성공 후기 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;

    const stories = await prisma.applicationSuccess.findMany({
      where: { policyId },
      select: {
        id: true,
        title: true,
        content: true,
        receivedAmount: true,
        daysToReceive: true,
        helpful: true,
        createdAt: true,
        user: {
          select: { email: true },
        },
      },
      orderBy: { helpful: "desc" },
      take: 10,
    });

    const avgAmount =
      stories.length > 0
        ? stories.reduce((sum, s) => sum + (s.receivedAmount || 0), 0) /
          stories.length
        : 0;

    const avgDays =
      stories.filter((s) => s.daysToReceive).length > 0
        ? stories.reduce((sum, s) => sum + (s.daysToReceive || 0), 0) /
          stories.filter((s) => s.daysToReceive).length
        : 0;

    return NextResponse.json({
      stories,
      count: stories.length,
      avgAmount: Math.round(avgAmount),
      avgDays: Math.round(avgDays),
    });
  } catch (error) {
    console.error("Error fetching success stories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 성공 후기 작성
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
    const { title, content, receivedAmount, daysToReceive } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const story = await prisma.applicationSuccess.create({
      data: {
        policyId,
        userId: user.id,
        title,
        content,
        receivedAmount: receivedAmount || null,
        daysToReceive: daysToReceive || null,
      },
    });

    return NextResponse.json({
      success: true,
      story: {
        id: story.id,
        title: story.title,
        content: story.content,
        receivedAmount: story.receivedAmount,
        daysToReceive: story.daysToReceive,
        createdAt: story.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating success story:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
