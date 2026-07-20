import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { trackings: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 관심 정책 목록
    const interestedPolicyIds = new Set(user.trackings.map((t) => t.policyId));

    // 7일 이내 마감 정책
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const urgentPolicies = await prisma.policy.findMany({
      where: {
        applyEnd: {
          gte: now,
          lte: sevenDaysLater,
        },
        id: {
          in: Array.from(interestedPolicyIds),
        },
      },
      select: {
        id: true,
        title: true,
        applyEnd: true,
        category: true,
      },
      orderBy: {
        applyEnd: "asc",
      },
    });

    // D-Day 계산
    const alerts = urgentPolicies.map((policy) => {
      const daysLeft = Math.ceil(
        (new Date(policy.applyEnd!).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return {
        id: policy.id,
        title: policy.title,
        category: policy.category,
        applyEnd: policy.applyEnd,
        daysLeft,
        urgent: daysLeft <= 3,
      };
    });

    return NextResponse.json({
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Error fetching deadline alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

