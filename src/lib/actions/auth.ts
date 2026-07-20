"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { checkLoginLock, recordFailedLogin, clearFailedLogins } from "@/lib/login-rate-limit";

const CredentialsSchema = z.object({
  email: z.email({ error: "올바른 이메일을 입력해주세요." }),
  password: z
    .string()
    .min(8, { error: "비밀번호는 8자 이상이어야 합니다." }),
});

export type AuthActionState = { error?: string } | undefined;

export async function signup(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "이미 가입된 이메일입니다." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, passwordHash, provider: "credentials" },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/profile" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "회원가입은 완료됐지만 로그인에 실패했습니다. 다시 로그인해주세요." };
    }
    throw error;
  }
}

export async function login(
  _state: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = CredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { email, password } = parsed.data;

  const lock = await checkLoginLock(email);
  if (lock.locked) {
    const minutes = Math.max(1, Math.ceil((lock.retryAfterMs ?? 0) / 60_000));
    return {
      error: `로그인 시도가 너무 많습니다. 약 ${minutes}분 후 다시 시도해주세요.`,
    };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/profile" });
  } catch (error) {
    if (error instanceof AuthError) {
      await recordFailedLogin(email);
      return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    // AuthError가 아니라는 것은 next-auth가 로그인 성공 후 리다이렉트를 던진 것이므로
    // 그동안의 실패 기록을 정리하고 리다이렉트가 정상 동작하도록 다시 던진다.
    await clearFailedLogins(email);
    throw error;
  }
}
