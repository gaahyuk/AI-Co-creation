import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";


import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AssetSimulator } from "./asset-simulator";

export default async function AssetFormationPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  // 자산 형성 정책 조회
  const assetPolicies = await prisma.assetFormationPolicy.findMany({
    include: { policy: true },
    take: 1,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl p-6">
          <Link href="/dashboard" className="text-violet-600 hover:underline">
            ← 대시보드로
          </Link>

          <div className="mt-4">
            <h1 className="text-3xl font-bold text-slate-900">
              자산 형성 정책
            </h1>
            <p className="mt-2 text-slate-600">
              정부 지원으로 더 효과적으로 자산을 형성하세요
            </p>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-4xl p-6">
        {assetPolicies.length > 0 ? (
          <div className="space-y-8">
            {assetPolicies.map((ap) => (
              <div key={ap.policyId} className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {ap.policy.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {ap.policy.provisionInstName}
                  </p>
                </div>

                {/* 정책 정보 */}
                <div className="mb-8 grid gap-4 md:grid-cols-3">
                  {ap.monthlyContribution && (
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-sm text-blue-600">권장 월 저축</p>
                      <p className="mt-2 font-bold text-blue-900">
                        {(ap.monthlyContribution / 10000).toFixed(0)}만원
                      </p>
                    </div>
                  )}
                  {ap.governmentSupport && (
                    <div className="rounded-lg bg-emerald-50 p-4">
                      <p className="text-sm text-emerald-600">정부 월 지원</p>
                      <p className="mt-2 font-bold text-emerald-900">
                        {(ap.governmentSupport / 10000).toFixed(0)}만원
                      </p>
                    </div>
                  )}
                  {ap.term && (
                    <div className="rounded-lg bg-violet-50 p-4">
                      <p className="text-sm text-violet-600">기간</p>
                      <p className="mt-2 font-bold text-violet-900">
                        {ap.term}개월
                      </p>
                    </div>
                  )}
                </div>

                {/* 시뮬레이터 */}
                <AssetSimulator
                  policyId={ap.policyId}
                  policyTitle={ap.policy.title}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-600">현재 이용 가능한 자산 형성 정책이 없습니다</p>
          </div>
        )}

        {/* 리워드 섹션 */}
        <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">
            🏆 자산 형성 리워드
          </h2>
          <p className="mb-6 text-slate-600">
            자산 형성 목표를 달성하면 다양한 리워드를 획득할 수 있습니다
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
              <span className="text-4xl">🎖️</span>
              <div>
                <h3 className="font-bold text-slate-900">자산 형성 시작</h3>
                <p className="text-sm text-slate-600">
                  자산 형성 정책 신청 시 300포인트
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 p-4">
              <span className="text-4xl">💎</span>
              <div>
                <h3 className="font-bold text-slate-900">목표 달성</h3>
                <p className="text-sm text-slate-600">
                  12개월 저축 완료 시 500포인트
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

