"use client";

import type { User } from "@/lib/prisma-types";

interface DashboardOverviewProps {
  user: User & {
    trackings: any[];
    documentProgressList: any[];
    assetSimulations: any[];
    rewards: any[];
    points: any;
  };
}

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const totalProgress =
    user.trackings.length > 0
      ? Math.round(
          (user.documentProgressList.filter(
            (d) => d.status === "completed" || d.status === "uploaded"
          ).length /
            user.documentProgressList.length) *
            100 || 0
        )
      : 0;

  const motivationalMessages = [
    "오늘도 한 발 더 나아가세요! 🚀",
    "당신의 꿈을 위해 지원하세요! 💪",
    "작은 신청이 큰 미래를 만듭니다! ✨",
    "모든 정책을 확인하셨나요? 📋",
    "타이밍이 중요해요! ⏰",
  ];

  const randomMessage =
    motivationalMessages[
      Math.floor(Math.random() * motivationalMessages.length)
    ];

  return (
    <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 p-6 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {user.email?.split("@")[0]}님 환영합니다! 👋
          </h2>
          <p className="mt-2 text-blue-100">{randomMessage}</p>
        </div>
        <div className="text-4xl">🎯</div>
      </div>

      {user.trackings.length > 0 && (
        <div className="mt-6 rounded-lg bg-white/20 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100">전체 진행률</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {totalProgress}%
              </p>
            </div>
            <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center">
              <div className="relative h-16 w-16 rounded-full bg-white/30 flex items-center justify-center">
                <span className="font-bold text-white">{totalProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
