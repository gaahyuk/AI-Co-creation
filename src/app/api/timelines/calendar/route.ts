import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || "1", 10); // 1-12
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Month must be between 1 and 12" },
        { status: 400 }
      );
    }

    // 해당 월의 시즌 정보와 정책들을 조회
    const seasonMap: Record<number, string[]> = {
      1: ["all_year", "winter", "q1"],
      2: ["all_year", "spring", "q1"],
      3: ["all_year", "semester_start", "spring", "q1"],
      4: ["all_year", "spring", "q2"],
      5: ["all_year", "spring", "q2"],
      6: ["all_year", "summer", "q2"],
      7: ["all_year", "summer", "q3"],
      8: ["all_year", "summer", "q3"],
      9: ["all_year", "semester_start", "fall", "q3"],
      10: ["all_year", "fall", "q4"],
      11: ["all_year", "fall", "q4"],
      12: ["all_year", "winter", "q4"],
    };

    const seasons = seasonMap[month] || [];

    // 해당 월에 해당하는 정책들 조회
    const policies = await prisma.policy.findMany({
      where: {
        timings: {
          some: {
            season: {
              in: seasons,
            },
          },
        },
        applyEnd: {
          gte: new Date(year, month - 1, 1),
        },
      },
      include: {
        timings: {
          where: {
            season: {
              in: seasons,
            },
          },
        },
      },
      take: 50,
    });

    // 사용자의 정책 저장 상태 조회
    let userTracking: Record<string, boolean> = {};
    if (user) {
      const trackings = await prisma.userPolicyTracking.findMany({
        where: {
          userId: user.id,
          policyId: { in: policies.map((p) => p.id) },
        },
      });
      userTracking = Object.fromEntries(
        trackings.map((t) => [t.policyId, true])
      );
    }

    return NextResponse.json({
      month,
      year,
      seasons,
      policies: policies.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        amount: p.estimatedAmount,
        org: p.provisionInstName,
        applyEnd: p.applyEnd,
        applyUrl: p.applyUrl,
        timingSeasons: p.timings.map((t) => t.season),
        interested: userTracking[p.id] || false,
      })),
    });
  } catch (error) {
    console.error("Error fetching calendar policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

