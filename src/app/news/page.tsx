import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

import Link from "next/link";
import { PolicyNewsList } from "./policy-news-list";

export default async function NewsPage() {
  const user = await getCurrentUser();
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
              📰 정책 뉴스
            </h1>
            <p className="mt-2 text-slate-600">
              최신 정책 소식을 한눈에 확인하세요
            </p>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-4xl p-6">
        <PolicyNewsList />
      </div>
    </div>
  );
}

