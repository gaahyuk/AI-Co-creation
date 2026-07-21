import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 10;

    const where: any = {};
    if (category) {
      where.category = category;
    }

    const [news, total] = await Promise.all([
      prisma.policyNews.findMany({
        where,
        orderBy: { published: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.policyNews.count({ where }),
    ]);

    return NextResponse.json({
      news,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create news" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, content, source, category, url, imageUrl } = body;

    if (!title || !content || !source || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const news = await prisma.policyNews.create({
      data: {
        title,
        content,
        source,
        category,
        url: url || null,
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      news,
    });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
