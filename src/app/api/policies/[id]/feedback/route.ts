import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET: 정책 피드백 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;

    const feedback = await prisma.policyFeedback.findMany({
      where: { policyId },
      select: {
        id: true,
        content: true,
        rating: true,
        helpful: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const avgRating =
      feedback.length > 0
        ? feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length
        : 0;

    return NextResponse.json({
      feedback,
      count: feedback.length,
      avgRating: Math.round(avgRating * 10) / 10,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 정책 피드백 추가
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: policyId } = await params;
    const body = await req.json();
    const { content, rating } = body;

    if (!content || content.trim().length === 0 || content.length > 500) {
      return NextResponse.json(
        { error: "Invalid content" },
        { status: 400 }
      );
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const feedback = await prisma.policyFeedback.create({
      data: {
        policyId,
        userId: user.id,
        content,
        rating: rating || null,
      },
    });

    // 리워드 포인트 추가 (첫 피드백)
    const feedbackCount = await prisma.policyFeedback.count({
      where: { userId: user.id },
    });

    if (feedbackCount === 1) {
      const reward = await prisma.reward.findUnique({
        where: { code: "first_feedback" },
      });

      if (reward) {
        await prisma.userReward.upsert({
          where: {
            userId_rewardId: {
              userId: user.id,
              rewardId: reward.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            rewardId: reward.id,
          },
        });

        const points = await prisma.userPoints.findUnique({
          where: { userId: user.id },
        });

        if (points) {
          await prisma.userPoints.update({
            where: { userId: user.id },
            data: {
              totalPoints: points.totalPoints + reward.points,
              level: Math.floor(
                (points.totalPoints + reward.points) / 1000
              ) + 1,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        content: feedback.content,
        rating: feedback.rating,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
