"use client";

import { useState } from "react";
import { formatManwon } from "@/lib/format";

interface SimulationResult {
  policy: {
    title: string;
    category: string;
  };
  simulation: {
    monthlyAmount: number;
    governmentMonthly: number;
    term: number;
    totalUserContribution: number;
    totalGovernmentSupport: number;
    totalSimulated: number;
  };
}

export function AssetSimulator({
  policyId,
  policyTitle,
}: {
  policyId: string;
  policyTitle: string;
}) {
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const amount = parseInt(monthlyAmount.replace(/,/g, ""), 10);

      if (!amount || amount <= 0) {
        throw new Error("유효한 금액을 입력하세요");
      }

      const response = await fetch("/api/asset-formation/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ policyId, monthlyAmount: amount }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `시뮬레이션에 실패했습니다 (상태: ${response.status})`);
      }

      const data: SimulationResult = await response.json();
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
        <h3 className="mb-6 text-2xl font-bold text-slate-900">
          💰 자산 형성 시뮬레이터
        </h3>

        <p className="mb-4 text-sm text-slate-600">
          {policyTitle}에서 월별로 얼마나 저축할 수 있는지 확인하세요
        </p>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              월 저축/투자 금액 (원)
            </label>
            <input
              type="text"
              placeholder="예: 100,000"
              value={formatCurrency(monthlyAmount)}
              onChange={(e) =>
                setMonthlyAmount(e.target.value.replace(/,/g, ""))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-right text-lg font-semibold text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              매월 규칙적으로 저축할 수 있는 금액을 입력하세요
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "계산 중..." : "자산 형성 계산하기 →"}
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
          {/* 월별 비교 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h4 className="mb-4 font-bold text-slate-900">월별 적립 현황</h4>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-600">내 저축</p>
                <p className="mt-2 text-2xl font-bold text-blue-900">
                  {formatManwon(result.simulation.monthlyAmount)}/월
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-sm text-emerald-600">정부 지원</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {formatManwon(result.simulation.governmentMonthly)}/월
                </p>
              </div>
            </div>
          </div>

          {/* 총액 비교 */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h4 className="mb-4 font-bold text-slate-900">
              {result.simulation.term}개월 후 예상 자산
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                <span className="text-sm font-medium text-slate-600">
                  내 저축 총액
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {formatManwon(result.simulation.totalUserContribution)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4">
                <span className="text-sm font-medium text-emerald-600">
                  정부 지원 총액
                </span>
                <span className="text-lg font-bold text-emerald-900">
                  {formatManwon(result.simulation.totalGovernmentSupport)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-violet-50 to-violet-100 p-4">
                <span className="text-sm font-bold text-violet-600">
                  최종 예상 자산
                </span>
                <span className="text-2xl font-bold text-violet-900">
                  {formatManwon(result.simulation.totalSimulated)}
                </span>
              </div>
            </div>
          </div>

          {/* 진행률 */}
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 p-6">
            <h4 className="mb-4 font-bold text-slate-900">자산 형성 로드맵</h4>

            <div className="space-y-3">
              {[12, 24, 36, 48].map((month) => {
                const proportion = month / result.simulation.term;
                const accumulated = Math.floor(
                  result.simulation.totalSimulated * proportion
                );
                return (
                  <div key={month}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {month}개월
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatManwon(accumulated)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                        style={{ width: `${proportion * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 팁 */}
          <div className="rounded-lg bg-amber-50 p-6">
            <h4 className="mb-3 font-bold text-amber-900">💡 자산 형성 팁</h4>
            <ul className="space-y-2 text-sm text-amber-800">
              <li>
                • 매월 정기적으로 저축하면 정부 지원금을 최대한 받을 수
                있습니다
              </li>
              <li>
                • 저축 중단 시 정부 지원이 중단될 수 있으니 꾸준히 저축하세요
              </li>
              <li>
                • 예상 자산은 정부 정책 변화에 따라 달라질 수 있습니다
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
