import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { policyIds } = body; // 비교할 정책 ID 배열

    if (!Array.isArray(policyIds) || policyIds.length < 2 || policyIds.length > 5) {
      return NextResponse.json(
        { error: "Please provide 2-5 policy IDs for comparison" },
        { status: 400 }
      );
    }

    const policies = await prisma.policy.findMany({
      where: {
        id: { in: policyIds },
      },
      include: {
        requiredDocuments: true,
        timings: true,
        documentGuides: { include: { document: true } },
      },
    });

    if (policies.length !== policyIds.length) {
      return NextResponse.json(
        { error: "Some policies not found" },
        { status: 404 }
      );
    }

    const comparisonData = policies.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      description: p.description,
      supportContent: p.supportContent,
      amount: p.estimatedAmount,
      provisionInst: p.provisionInstName,
      applyStart: p.applyStart,
      applyEnd: p.applyEnd,
      applyUrl: p.applyUrl,
      ageMin: p.ageMin,
      ageMax: p.ageMax,
      regionCodes: p.regionCodes,
      jobStatusCodes: p.jobStatusCodes,
      incomeCondition: p.incomeCondition,
      requiredDocs: p.requiredDocuments.length,
      timings: p.timings.map((t) => t.season),
    }));

    return NextResponse.json({
      policies: comparisonData,
      count: comparisonData.length,
    });
  } catch (error) {
    console.error("Error comparing policies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
