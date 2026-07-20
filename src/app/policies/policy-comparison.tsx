"use client";

import { useState } from "react";
import { formatManwon } from "@/lib/format";

interface ComparisonPolicy {
  id: string;
  title: string;
  category: string;
  description: string | null;
  supportContent: string | null;
  amount: number | null;
  provisionInst: string | null;
  applyStart: string | null;
  applyEnd: string | null;
  applyUrl: string | null;
  ageMin: number | null;
  ageMax: number | null;
  regionCodes: any;
  jobStatusCodes: any;
  incomeCondition: any;
  requiredDocs: number;
  timings: string[];
}

export function PolicyComparison({
  selectedPolicies,
}: {
  selectedPolicies: string[];
}) {
  const [comparisons, setComparisons] = useState<ComparisonPolicy[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (selectedPolicies.length < 2) {
      alert("2개 이상의 정책을 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/policies/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyIds: selectedPolicies }),
      });

      if (!response.ok) throw new Error("비교 실패");

      const data = await response.json();
      setComparisons(data.policies);
    } catch (error) {
      alert("정책 비교에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  if (comparisons.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h3 className="mb-6 text-2xl font-bold text-slate-900">정책 비교</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-4 text-left font-semibold text-slate-900">
                항목
              </th>
              {comparisons.map((p) => (
                <th
                  key={p.id}
                  className="py-3 px-4 text-left font-semibold text-slate-900"
                >
                  {p.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 카테고리 */}
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 font-medium text-slate-700">카테고리</td>
              {comparisons.map((p) => (
                <td key={p.id} className="py-3 px-4 text-slate-900">
                  {p.category}
                </td>
              ))}
            </tr>

            {/* 지원금액 */}
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 font-medium text-slate-700">
                지원금액
              </td>
              {comparisons.map((p) => (
                <td
                  key={p.id}
                  className="py-3 px-4 font-bold text-violet-600"
                >
                  {p.amount ? formatManwon(p.amount) : "미정"}
                </td>
              ))}
            </tr>

            {/* 주관기관 */}
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 font-medium text-slate-700">
                주관기관
              </td>
              {comparisons.map((p) => (
                <td key={p.id} className="py-3 px-4 text-slate-900">
                  {p.provisionInst || "-"}
                </td>
              ))}
            </tr>

            {/* 신청 기간 */}
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 font-medium text-slate-700">신청기간</td>
              {comparisons.map((p) => (
                <td key={p.id} className="py-3 px-4 text-slate-900 text-xs">
                  {p.applyStart && p.applyEnd ? (
                    <>
                      {new Date(p.applyStart).toLocaleDateString("ko-KR")} ~
                      <br />
                      {new Date(p.applyEnd).toLocaleDateString("ko-KR")}
                    </>
                  ) : (
                    "상시"
                  )}
                </td>
              ))}
            </tr>

            {/* 나이 조건 */}
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 font-medium text-slate-700">
                나이 조건
              </td>
              {comparisons.map((p) => (
                <td key={p.id} className="py-3 px-4 text-slate-900">
                  {p.ageMin || p.ageMax ? (
                    <>
                      {p.ageMin}~{p.ageMax}세
                    </>
                  ) : (
                    "제한없음"
                  )}
                </td>
              ))}
            </tr>

            {/* 필요서류 */}
            <tr className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-4 font-medium text-slate-700">
                필요서류
              </td>
              {comparisons.map((p) => (
                <td key={p.id} className="py-3 px-4 text-slate-900">
                  {p.requiredDocs}개
                </td>
              ))}
            </tr>

            {/* 신청 시기 */}
            <tr>
              <td className="py-3 px-4 font-medium text-slate-700">
                최적 신청 시기
              </td>
              {comparisons.map((p) => (
                <td key={p.id} className="py-3 px-4 text-slate-900 text-xs">
                  {p.timings.length > 0
                    ? p.timings.join(", ")
                    : "연중 상시"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
