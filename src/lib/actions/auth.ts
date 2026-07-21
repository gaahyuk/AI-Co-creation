"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "이미 가입된 이메일입니다." };
    }
    return { error: "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  redirect("/profile");
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect("/profile");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
