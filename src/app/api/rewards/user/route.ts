import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        rewards: {
          include: { reward: true },
        },
        points: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 포인트 정보 조회 또는 생성
    let points = user.points;
    if (!points) {
      points = await prisma.userPoints.create({
        data: { userId: user.id },
      });
    }

    return NextResponse.json({
      user: {
        email: user.email,
        points: points.totalPoints,
        level: points.level,
      },
      rewards: user.rewards.map((ur) => ({
        code: ur.reward.code,
        name: ur.reward.name,
        description: ur.reward.description,
        icon: ur.reward.icon,
        earnedAt: ur.earnedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user rewards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

