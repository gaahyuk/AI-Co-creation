import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category");

    if (query.length === 0) {
      return NextResponse.json({ policies: [] });
    }

    const where: any = {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { keywords: { contains: query } },
      ],
      applyEnd: { gte: new Date() },
    };

    if (category) {
      where.category = category;
    }

    const policies = await prisma.policy.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        estimatedAmount: true,
        provisionInstName: true,
        applyEnd: true,
      },
      take: 20,
    });

    return NextResponse.json({ policies, count: policies.length });
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
