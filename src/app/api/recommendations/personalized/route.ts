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
      include: { profile: true, trackings: true },
    });

    if (!user || !user.profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 모든 정책 조회
    const allPolicies = await prisma.policy.findMany({
      where: {
        applyEnd: {
          gte: new Date(),
        },
      },
      include: { timings: true },
      take: 200,
    });

    // 추천 점수 계산
    const recommendations = allPolicies
      .map((policy) => {
        let score = 0;
        let reasons: string[] = [];

        // 1. 나이 조건 (20점)
        if (policy.ageMin || policy.ageMax) {
          const userAge = new Date().getFullYear() -
            new Date(user.profile!.birthDate).getFullYear();
          if (
            (!policy.ageMin || userAge >= policy.ageMin) &&
            (!policy.ageMax || userAge <= policy.ageMax)
          ) {
            score += 20;
            reasons.push("나이 조건 충족");
          }
        } else {
          score += 10;
        }

        // 2. 지역 조건 (15점)
        const regionCodes = Array.isArray(policy.regionCodes)
          ? policy.regionCodes
          : [];
        if (
          regionCodes.length === 0 ||
          regionCodes.includes(user.profile!.regionCode?.substring(0, 2))
        ) {
          score += 15;
          reasons.push("지역 조건 충족");
        }

        // 3. 직업 상태 (15점)
        const jobStatusCodes = Array.isArray(policy.jobStatusCodes)
          ? policy.jobStatusCodes
          : [];
        if (
          jobStatusCodes.length === 0 ||
          jobStatusCodes.includes(user.profile!.jobStatus)
        ) {
          score += 15;
          reasons.push("직업 상태 조건 충족");
        }

        // 4. 지원금액 (10점)
        if (policy.estimatedAmount && policy.estimatedAmount > 1_000_000) {
          score += 10;
          reasons.push("높은 지원금액");
        }

        // 5. 마감까지 시간 (10점)
        if (policy.applyEnd) {
          const daysLeft = Math.ceil(
            (new Date(policy.applyEnd).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysLeft <= 14) {
            score += 10;
            reasons.push("곧 마감됨 - 지금 신청하세요!");
          }
        }

        // 6. 이미 관심 정책이면 감소
        if (user.trackings.find((t) => t.policyId === policy.id)) {
          score -= 30;
        }

        return {
          id: policy.id,
          title: policy.title,
          category: policy.category,
          amount: policy.estimatedAmount,
          score: Math.max(0, score),
          reason: reasons.join(" + "),
        };
      })
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.score > 20)
      .slice(0, 10);

    // 추천 저장
    for (const rec of recommendations) {
      await prisma.policyRecommendation.upsert({
        where: {
          userId_policyId: {
            userId: user.id,
            policyId: rec.id,
          },
        },
        update: {
          score: rec.score,
          reason: rec.reason,
        },
        create: {
          userId: user.id,
          policyId: rec.id,
          score: rec.score,
          reason: rec.reason,
        },
      });
    }

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

