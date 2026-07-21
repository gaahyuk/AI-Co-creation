import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { categories, frequency, subscribed } = body;

    const subscription = await prisma.newsletterSubscription.upsert({
      where: { userId: user.id },
      update: {
        categories: categories ?? null,
        frequency: frequency || "weekly",
        subscribed: subscribed ?? true,
      },
      create: {
        userId: user.id,
        email: user.email ?? "",
        categories: categories ?? null,
        frequency: frequency || "weekly",
        subscribed: subscribed ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        email: subscription.email,
        categories: subscription.categories,
        frequency: subscription.frequency,
        subscribed: subscription.subscribed,
      },
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      subscription: subscription || null,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

