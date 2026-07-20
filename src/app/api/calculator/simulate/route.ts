import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



interface IncomeCondition {
  type: "bracket" | "amount" | "none";
  operator?: "lte" | "gte" | "eq";
  value?: string | number;
  min?: number;
  max?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { incomeAmount } = body;

    if (!incomeAmount || incomeAmount < 0) {
      return NextResponse.json(
        { error: "Invalid income amount" },
        { status: 400 }
      );
    }

    // 사용자 정보 업데이트
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 소득 분위 계산 (한국 중위소득 기준)
    const medianIncome = 5_380_000; // 4인 가구 중위소득 (2025년)
    const incomeBracket = calculateIncomeBracket(incomeAmount, medianIncome);

    // 프로필 업데이트
    if (user.profile) {
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          incomeAmount,
          incomeBracket,
        },
      });
    }

    // 소득 조건에 맞는 정책들 조회
    const allPolicies = await prisma.policy.findMany({
      where: {
        applyEnd: {
          gte: new Date(),
        },
      },
    });

    const matchedPolicies = allPolicies.filter((policy) => {
      if (!policy.incomeCondition) return true;

      const condition = policy.incomeCondition as unknown as IncomeCondition;

      if (condition.type === "none") return true;

      if (condition.type === "bracket") {
        // 소득분위 기반 조건 (예: "50%이하")
        const bracketValue = parseFloat(condition.value as string);
        const userBracketValue = (incomeAmount / medianIncome) * 100;
        return userBracketValue <= bracketValue;
      }

      if (condition.type === "amount") {
        // 절대 금액 기반 조건
        const conditionAmount = Number(condition.value);
        if (condition.operator === "lte") return incomeAmount <= conditionAmount;
        if (condition.operator === "gte") return incomeAmount >= conditionAmount;
        if (condition.operator === "eq") return incomeAmount === conditionAmount;
      }

      return true;
    });

    // 지원금액 합계 계산
    const totalBenefit = matchedPolicies.reduce(
      (sum, p) => sum + (p.estimatedAmount || 0),
      0
    );

    return NextResponse.json({
      success: true,
      userIncome: incomeAmount,
      incomeBracket,
      matchedPoliciesCount: matchedPolicies.length,
      totalBenefit,
      policies: matchedPolicies.slice(0, 20).map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        amount: p.estimatedAmount,
        org: p.provisionInstName,
        applyEnd: p.applyEnd,
      })),
    });
  } catch (error) {
    console.error("Error simulating income:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function calculateIncomeBracket(
  income: number,
  medianIncome: number
): string {
  const percentage = (income / medianIncome) * 100;

  if (percentage <= 30) return "30%이하";
  if (percentage <= 50) return "50%이하";
  if (percentage <= 70) return "70%이하";
  if (percentage <= 100) return "100%이하";
  if (percentage <= 120) return "120%이하";
  if (percentage <= 150) return "150%이하";
  if (percentage <= 200) return "200%이하";
  return "200%초과";
}

