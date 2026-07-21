import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        channel: "email",
        templateCode: "test",
        status: "sent",
      },
    });

    return NextResponse.json({
      success: true,
      message: "이메일 알림이 전송되었습니다",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

