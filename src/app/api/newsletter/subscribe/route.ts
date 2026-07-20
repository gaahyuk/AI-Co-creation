import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";



export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { categories, frequency, subscribed } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscription = await prisma.newsletterSubscription.upsert({
      where: { userId: user.id },
      update: {
        categories: categories ?? null,
        frequency: frequency || "weekly",
        subscribed: subscribed ?? true,
      },
      create: {
        userId: user.id,
        email: session.user.email,
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
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { email: session.user.email },
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

