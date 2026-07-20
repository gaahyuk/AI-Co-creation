import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST: 신청 체크리스트 생성/업데이트
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
    const { checklist } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const applicationChecklist = await prisma.applicationChecklist.upsert({
      where: {
        userId_policyId: {
          userId: user.id,
          policyId,
        },
      },
      update: {
        checklist,
      },
      create: {
        userId: user.id,
        policyId,
        checklist,
      },
    });

    return NextResponse.json({
      success: true,
      checklist: applicationChecklist,
    });
  } catch (error) {
    console.error("Error updating checklist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: 신청 완료 표시
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: policyId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const applicationChecklist = await prisma.applicationChecklist.update({
      where: {
        userId_policyId: {
          userId: user.id,
          policyId,
        },
      },
      data: {
        completed: true,
        submittedAt: new Date(),
      },
    });

    // 리워드 포인트 추가
    const reward = await prisma.reward.findUnique({
      where: { code: "first_policy_apply" },
    });

    if (reward) {
      const userReward = await prisma.userReward.findUnique({
        where: {
          userId_rewardId: {
            userId: user.id,
            rewardId: reward.id,
          },
        },
      });

      if (!userReward) {
        await prisma.userReward.create({
          data: {
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
              level: Math.floor((points.totalPoints + reward.points) / 1000) + 1,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      checklist: applicationChecklist,
    });
  } catch (error) {
    console.error("Error completing application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
