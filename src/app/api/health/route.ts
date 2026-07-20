import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const policyCount = await prisma.policy.count();
    const userCount = await prisma.user.count();
    const policyTimingCount = await prisma.policyTiming.count();
    const assetPolicyCount = await prisma.assetFormationPolicy.count();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      stats: {
        totalPolicies: policyCount,
        totalUsers: userCount,
        policiesWithTiming: policyTimingCount,
        assetFormationPolicies: assetPolicyCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
