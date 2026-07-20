import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const seasons = [
      "semester_start",
      "summer",
      "winter",
      "spring",
      "fall",
      "q1",
      "q2",
      "q3",
      "q4",
      "all_year",
    ];

    const seasonLabels: Record<string, string> = {
      semester_start: "학기 시작 (3월, 9월)",
      summer: "여름방학 (6-8월)",
      winter: "겨울방학 (12-2월)",
      spring: "봄 (3-5월)",
      fall: "가을 (9-11월)",
      q1: "1분기 (1-3월)",
      q2: "2분기 (4-6월)",
      q3: "3분기 (7-9월)",
      q4: "4분기 (10-12월)",
      all_year: "연중 상시",
    };

    const result: Record<
      string,
      {
        label: string;
        policies: Array<{
          id: string;
          title: string;
          category: string;
          amount: number | null;
          org: string | null;
          applyEnd: Date | null;
          interested: boolean;
        }>;
      }
    > = {};

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    for (const season of seasons) {
      const policies = await prisma.policy.findMany({
        where: {
          timings: {
            some: {
              season,
            },
          },
          applyEnd: {
            gte: new Date(),
          },
        },
        take: 20,
      });

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

      if (policies.length > 0) {
        result[season] = {
          label: seasonLabels[season],
          policies: policies.map((p) => ({
            id: p.id,
            title: p.title,
            category: p.category,
            amount: p.estimatedAmount,
            org: p.provisionInstName,
            applyEnd: p.applyEnd,
            interested: userTracking[p.id] || false,
          })),
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching season policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

