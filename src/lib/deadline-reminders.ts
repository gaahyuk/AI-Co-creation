import { prisma } from "@/lib/prisma";
import { getAlimtalkClient } from "@/lib/adapters";

const REMINDER_DAYS = [7, 1]; // 마감 D-7, D-1에 알림

function daysUntil(target: Date, now: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((target.getTime() - now.getTime()) / msPerDay);
}

export interface DeadlineReminderSummary {
  checked: number;
  sent: number;
  skippedAlreadyNotified: number;
}

// 관심 등록(또는 준비 중)한 정책의 신청 마감일이 D-7/D-1일 때 알림을 발송한다.
// 사용자가 휴대폰 번호를 등록했으면 카카오 알림톡(mock)으로, 아니면 이메일 폴백 경로로 기록한다.
// 같은 날 중복 발송을 막기 위해 NotificationLog에 이미 같은 템플릿으로 보낸 기록이 있으면 건너뛴다.
export async function runDeadlineReminderCheck(
  now: Date = new Date()
): Promise<DeadlineReminderSummary> {
  const trackings = await prisma.userPolicyTracking.findMany({
    where: {
      status: { in: ["interested", "checklist_in_progress"] },
    },
    include: {
      policy: true,
      user: { include: { profile: true } },
    },
  });

  const alimtalk = getAlimtalkClient();
  let sent = 0;
  let skippedAlreadyNotified = 0;

  for (const tracking of trackings) {
    if (!tracking.policy.applyEnd) continue;

    const remaining = daysUntil(tracking.policy.applyEnd, now);
    if (!REMINDER_DAYS.includes(remaining)) continue;

    const templateCode = `deadline_d${remaining}_${tracking.policyId}`;
    const alreadyNotified = await prisma.notificationLog.findFirst({
      where: { userId: tracking.userId, templateCode },
    });
    if (alreadyNotified) {
      skippedAlreadyNotified++;
      continue;
    }

    const phone = tracking.user.profile?.phone;
    let channel: string;
    let status: string;

    if (phone) {
      channel = "kakao_alimtalk";
      const result = await alimtalk.send(phone, "DEADLINE_REMINDER", {
        policyTitle: tracking.policy.title,
        daysLeft: String(remaining),
      });
      status = result.status;
    } else {
      channel = "email";
      status = "fallback_used";
      console.log(
        `[fallback-email] to=${tracking.user.email ?? "(이메일 없음)"} policy=${tracking.policy.title} D-${remaining}`
      );
    }

    await prisma.notificationLog.create({
      data: { userId: tracking.userId, channel, templateCode, status },
    });
    sent++;
  }

  return { checked: trackings.length, sent, skippedAlreadyNotified };
}
