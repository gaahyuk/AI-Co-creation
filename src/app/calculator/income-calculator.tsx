"use client";

import { useState } from "react";
import { formatManwon } from "@/lib/format";

interface CalculatorResult {
  userIncome: number;
  incomeBracket: string;
  matchedPoliciesCount: number;
  totalBenefit: number;
  policies: Array<{
    id: string;
    title: string;
    category: string;
    amount: number | null;
    org: string | null;
    applyEnd: string | null;
  }>;
}

export function IncomeCalculator() {
  const [incomeInput, setIncomeInput] = useState("");
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const income = parseInt(incomeInput.replace(/,/g, ""), 10);

      if (!income || income < 0) {
        throw new Error("올바른 소득을 입력하세요");
      }

      const response = await fetch("/api/calculator/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incomeAmount: income }),
      });

      if (!response.ok) {
        throw new Error("계산에 실패했습니다");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="space-y-6">
      {/* 입력 폼 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">
          💰 소득 기반 정책 계산기
        </h2>

        <form onSubmit={handleCalculate} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              연간 소득 (원)
            </label>
            <input
              type="text"
              placeholder="예: 40,000,000"
              value={formatCurrency(incomeInput)}
              onChange={(e) =>
                setIncomeInput(e.target.value.replace(/,/g, ""))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-right text-lg font-semibold text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              국세청 소득 자료, 건강보험 소득 자료 등을 참고하세요
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "계산 중..." : "지원 정책 확인하기 →"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* 결과 표시 */}
      {result && (
        <div className="space-y-6">
          {/* 요약 정보 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-6">
              <p className="text-sm text-blue-600">입력하신 소득</p>
              <p className="mt-2 text-2xl font-bold text-blue-900">
                {formatManwon(result.userIncome)}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                중위소득 기준: {result.incomeBracket}
              </p>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 p-6">
              <p className="text-sm text-emerald-600">신청 가능한 정책</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">
                {result.matchedPoliciesCount}개
              </p>
              <p className="mt-1 text-xs text-emerald-700">정책 중</p>
            </div>

            <div className="rounded-lg bg-gradient-to-br from-violet-50 to-violet-100 p-6">
              <p className="text-sm text-violet-600">예상 지원금액</p>
              <p className="mt-2 text-2xl font-bold text-violet-900">
                {formatManwon(result.totalBenefit)}
              </p>
              <p className="mt-1 text-xs text-violet-700">최대 예상액</p>
            </div>
          </div>

          {/* 정책 목록 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              신청 가능한 정책 ({result.policies.length}개)
            </h3>

            <div className="space-y-3">
              {result.policies.map((policy) => (
                <a
                  key={policy.id}
                  href={`/policies/${policy.id}`}
                  className="block rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all hover:border-violet-300 hover:bg-violet-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {policy.category}
                        </span>
                        {policy.amount && (
                          <span className="font-semibold text-violet-600">
                            {formatManwon(policy.amount)}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2 font-semibold text-slate-900">
                        {policy.title}
                      </h4>
                      {policy.org && (
                        <p className="mt-1 text-sm text-slate-600">{policy.org}</p>
                      )}
                    </div>
                    {policy.applyEnd && (
                      <div className="whitespace-nowrap text-right text-xs text-slate-500">
                        <p>마감:</p>
                        <p className="font-semibold text-slate-900">
                          {new Date(policy.applyEnd).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* 안내 */}
          <div className="rounded-lg bg-amber-50 p-6">
            <h4 className="mb-3 font-bold text-amber-900">⚠️ 주의사항</h4>
            <ul className="space-y-2 text-sm text-amber-800">
              <li>
                • 계산 결과는 소득 조건만 고려한 것이며, 실제 자격 심사 시
                다른 조건들이 추가로 검토됩니다
              </li>
              <li>
                • 정책별로 나이, 지역, 직업 등 추가 조건이 있을 수 있습니다
              </li>
              <li>
                • 정확한 신청 자격은 각 정책의 공식 페이지에서 확인하세요
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
