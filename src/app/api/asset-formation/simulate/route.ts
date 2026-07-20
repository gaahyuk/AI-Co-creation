import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    console.log("[asset-formation] 요청 시작");

    const body = await req.json();
    console.log("[asset-formation] 바디:", body);
    const { policyId, monthlyAmount } = body;

    if (!policyId || !monthlyAmount || monthlyAmount <= 0) {
      console.log("[asset-formation] 입력 검증 실패");
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    // 자산 형성 정책 조회
    console.log("[asset-formation] 정책 조회:", policyId);
    const assetPolicy = await prisma.assetFormationPolicy.findUnique({
      where: { policyId },
      include: { policy: true },
    });

    if (!assetPolicy) {
      console.log("[asset-formation] 정책 없음:", policyId);
      return NextResponse.json(
        { error: "Asset formation policy not found" },
        { status: 404 }
      );
    }

    console.log("[asset-formation] 정책 발견:", assetPolicy.policy.title);

    // 사용자 정보 조회
    const session = await auth();
    console.log("[asset-formation] 세션:", session?.user?.email);

    if (!session?.user?.email) {
      console.log("[asset-formation] 세션 없음");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log("[asset-formation] 사용자 DB에 없음:", session.user.email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("[asset-formation] 사용자 발견:", user.id);

    // 시뮬레이션 계산
    const userMonthly = monthlyAmount;
    const governmentMonthly = Math.min(
      monthlyAmount, // 사용자가 낸 금액만큼만
      assetPolicy.governmentSupport || 100_000
    );

    const term = assetPolicy.term || 48;
    const totalUserContribution = userMonthly * term;
    const totalGovernmentSupport = Math.min(
      governmentMonthly * term,
      assetPolicy.maxBenefit || 5_000_000
    );
    const totalSimulated = totalUserContribution + totalGovernmentSupport;

    // 시뮬레이션 저장 (assetPolicy.id 사용!)
    console.log("[asset-formation] 시뮬레이션 저장:", { userId: user.id, policyId: assetPolicy.id });
    const simulation = await prisma.userAssetSimulation.upsert({
      where: {
        userId_policyId: {
          userId: user.id,
          policyId: assetPolicy.id,  // <- AssetFormationPolicy.id를 사용!
        },
      },
      update: {
        monthlyAmount: userMonthly,
        simulatedAmount: totalSimulated,
        governmentSupport: totalGovernmentSupport,
      },
      create: {
        userId: user.id,
        policyId: assetPolicy.id,  // <- AssetFormationPolicy.id를 사용!
        monthlyAmount: userMonthly,
        simulatedAmount: totalSimulated,
        governmentSupport: totalGovernmentSupport,
      },
    });
    console.log("[asset-formation] 시뮬레이션 저장 완료:", simulation.id);

    return NextResponse.json({
      success: true,
      policy: {
        title: assetPolicy.policy.title,
        category: assetPolicy.category,
      },
      simulation: {
        monthlyAmount: userMonthly,
        governmentMonthly,
        term,
        totalUserContribution,
        totalGovernmentSupport,
        totalSimulated,
      },
    });
  } catch (error) {
    console.error("Error simulating asset formation:", error);
    console.error("Error simulating asset formation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

