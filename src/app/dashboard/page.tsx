import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";


import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatManwon } from "@/lib/format";
import { DashboardOverview } from "./dashboard-overview";
import { DeadlineAlerts } from "./deadline-alerts";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      trackings: true,
      documentProgressList: true,
      assetSimulations: true,
      rewards: { include: { reward: true } },
      points: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // 포인트 초기화
  let points = user.points;
  if (!points) {
    points = await prisma.userPoints.create({
      data: { userId: user.id },
    });
  }

  const appliedPolicies = user.trackings.length;
  const preparedDocuments = user.documentProgressList.filter(
    (d) => d.status === "completed" || d.status === "uploaded"
  ).length;
  const assetSimulations = user.assetSimulations.length;
  const earnedRewards = user.rewards.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl p-6">
          <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
          <p className="mt-2 text-slate-600">
            당신의 정책 신청 여정을 한눈에 확인하세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-6xl p-6">
        {/* 대시보드 개요 */}
        <DashboardOverview user={user} />

        {/* 통계 카드 */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-600">신청한 정책</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {appliedPolicies}
            </p>
            <p className="mt-2 text-xs text-slate-500">개 정책</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-600">준비한 서류</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {preparedDocuments}
            </p>
            <p className="mt-2 text-xs text-slate-500">개 서류</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-600">자산 형성 계획</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {assetSimulations}
            </p>
            <p className="mt-2 text-xs text-slate-500">개 진행 중</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-600">획득한 배지</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {earnedRewards}
            </p>
            <p className="mt-2 text-xs text-slate-500">개 배지</p>
          </div>
        </div>

        {/* 포인트 & 레벨 */}
        <div className="mb-8 rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-violet-900">
                레벨 {points.level}
              </h2>
              <p className="mt-1 text-sm text-violet-700">
                총 {points.totalPoints.toLocaleString()}포인트 획득
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-violet-600">
                {points.totalPoints}
              </div>
              <p className="mt-1 text-xs text-violet-600">pts</p>
            </div>
          </div>

          {/* 포인트 진행바 */}
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-violet-700">다음 레벨까지</span>
              <span className="font-semibold text-violet-900">
                {Math.max(0, (points.level * 1000) - points.totalPoints)}{" "}
                포인트
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-violet-200">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all"
                style={{
                  width: `${Math.min(100, ((points.totalPoints % 1000) / 1000) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 마감임박 알림 */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            ⏰ 마감임박 정책
          </h2>
          <DeadlineAlerts />
        </div>

        {/* 빠른 접근 */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            빠른 접근
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Link
              href="/policies"
              className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="text-3xl">📋</div>
              <h3 className="mt-3 font-bold text-slate-900">맞춤 정책</h3>
              <p className="mt-1 text-sm text-slate-600">
                나에게 맞는 정책 찾기
              </p>
            </Link>

            <Link
              href="/timelines"
              className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="text-3xl">📅</div>
              <h3 className="mt-3 font-bold text-slate-900">정책 타임라인</h3>
              <p className="mt-1 text-sm text-slate-600">
                시즌별 정책 확인
              </p>
            </Link>

            <Link
              href="/calculator"
              className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="text-3xl">💰</div>
              <h3 className="mt-3 font-bold text-slate-900">소득 계산기</h3>
              <p className="mt-1 text-sm text-slate-600">
                받을 수 있는 정책
              </p>
            </Link>

            <Link
              href="/asset-formation"
              className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="text-3xl">💎</div>
              <h3 className="mt-3 font-bold text-slate-900">자산 형성</h3>
              <p className="mt-1 text-sm text-slate-600">
                미래 자산 계획
              </p>
            </Link>

            <Link
              href="/recommendations"
              className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="text-3xl">🎯</div>
              <h3 className="mt-3 font-bold text-slate-900">맞춤 추천</h3>
              <p className="mt-1 text-sm text-slate-600">
                AI 추천 정책
              </p>
            </Link>

            <Link
              href="/news"
              className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="text-3xl">📰</div>
              <h3 className="mt-3 font-bold text-slate-900">뉴스</h3>
              <p className="mt-1 text-sm text-slate-600">
                정책 소식
              </p>
            </Link>
          </div>
        </div>

        {/* 최근 활동 */}
        {user.rewards.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              🏆 획득한 배지
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {user.rewards.map((ur) => (
                <div
                  key={ur.id}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                >
                  <span className="text-2xl">{ur.reward.icon}</span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {ur.reward.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {ur.reward.description}
                    </p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-violet-600">
                    +{ur.reward.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

