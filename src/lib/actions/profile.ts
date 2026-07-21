"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";

const ProfileSchema = z.object({
  birthDate: z.string().min(1, { error: "생년월일을 입력해주세요." }),
  regionCode: z.string().min(1, { error: "거주지역을 선택해주세요." }),
  jobStatus: z.string().min(1, { error: "직업/고용상태를 선택해주세요." }),
  incomeBracket: z.string().optional(),
  incomeAmount: z.string().optional(),
  major: z.string().optional(),
  phone: z.string().optional(),
});

export type ProfileActionState = { error?: string } | undefined;

export async function saveProfile(
  _state: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = ProfileSchema.safeParse({
    birthDate: formData.get("birthDate"),
    regionCode: formData.get("regionCode"),
    jobStatus: formData.get("jobStatus"),
    incomeBracket: formData.get("incomeBracket") ?? undefined,
    incomeAmount: formData.get("incomeAmount") ?? undefined,
    major: formData.get("major") ?? undefined,
    phone: formData.get("phone") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { birthDate, regionCode, jobStatus, incomeBracket, incomeAmount, major, phone } =
    parsed.data;

  const data = {
    birthDate: new Date(birthDate),
    regionCode,
    jobStatus,
    incomeBracket: incomeBracket && incomeBracket !== "" ? incomeBracket : null,
    incomeAmount: incomeAmount && incomeAmount !== "" ? Number(incomeAmount) : null,
    major: major && major !== "" ? major : null,
    phone: phone && phone !== "" ? phone : null,
  };

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  redirect("/policies");
}
