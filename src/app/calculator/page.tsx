import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

import Link from "next/link";
import { IncomeCalculator } from "./income-calculator";

export default async function CalculatorPage() {
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
              소득 기반 정책 계산기
            </h1>
            <p className="mt-2 text-slate-600">
              당신의 소득으로 받을 수 있는 정책을 한번에 확인하세요
            </p>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-4xl p-6">
        <IncomeCalculator />
      </div>
    </div>
  );
}

