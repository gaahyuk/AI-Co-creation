import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import Link from "next/link";
import { formatManwon } from "@/lib/format";
import { PersonalizedRecommendations } from "./personalized-recommendations";

export default async function RecommendationsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

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
              🎯 맞춤형 추천 정책
            </h1>
            <p className="mt-2 text-slate-600">
              당신의 프로필에 기반한 최고의 정책들을 추천해드립니다
            </p>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-4xl p-6">
        <PersonalizedRecommendations />
      </div>
    </div>
  );
}

