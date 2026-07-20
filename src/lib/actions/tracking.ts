"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function toggleInterest(policyId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("로그인이 필요합니다.");
  }

  const existing = await prisma.userPolicyTracking.findUnique({
    where: { userId_policyId: { userId: session.user.id, policyId } },
  });

  if (existing) {
    await prisma.userPolicyTracking.delete({ where: { id: existing.id } });
  } else {
    await prisma.userPolicyTracking.create({
      data: { userId: session.user.id, policyId, status: "interested" },
    });
  }

  revalidatePath("/policies");
}
