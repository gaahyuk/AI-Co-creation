import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// Supabase Auth 세션 + public."User" 프로필을 한 번에 가져오는 공용 헬퍼.
// auth.users insert 시 DB 트리거(on_auth_user_created)가 프로필 row를 자동 생성해두므로
// 여기서는 조회만 하면 된다 (upsert 불필요).
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return prisma.user.findUnique({ where: { id: user.id } });
}
