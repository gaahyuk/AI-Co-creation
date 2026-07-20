import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15분

// 대소문자/앞뒤 공백만 다른 이메일로 잠금을 우회하지 못하도록 추적 키를 정규화한다.
// (실제 로그인 인증 자체는 원본 이메일로 그대로 진행하며, 이 정규화는 rate-limit 용도로만 쓰인다.)
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface LoginLockStatus {
  locked: boolean;
  retryAfterMs?: number;
}

// 최근 WINDOW_MS 동안의 실패 기록이 MAX_ATTEMPTS 이상이면 잠금 처리한다.
export async function checkLoginLock(email: string): Promise<LoginLockStatus> {
  const since = new Date(Date.now() - WINDOW_MS);
  const attempts = await prisma.loginAttempt.findMany({
    where: { email: normalizeEmail(email), createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (attempts.length < MAX_ATTEMPTS) {
    return { locked: false };
  }

  const retryAfterMs = Math.max(
    attempts[0].createdAt.getTime() + WINDOW_MS - Date.now(),
    0
  );
  return { locked: true, retryAfterMs };
}

export async function recordFailedLogin(email: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { email: normalizeEmail(email) } });
}

// 로그인 성공 시 그동안 쌓인 실패 기록을 지워 다음 잠금 판정에 영향을 주지 않게 한다.
export async function clearFailedLogins(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email: normalizeEmail(email) } });
}
