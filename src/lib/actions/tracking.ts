"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function toggleInterest(policyId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const existing = await prisma.userPolicyTracking.findUnique({
    where: { userId_policyId: { userId: user.id, policyId } },
  });

  if (existing) {
    await prisma.userPolicyTracking.delete({ where: { id: existing.id } });
  } else {
    await prisma.userPolicyTracking.create({
      data: { userId: user.id, policyId, status: "interested" },
    });
  }

  revalidatePath("/policies");
}
