"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/storage";
import { formatManwon } from "@/lib/format";
import {
  calculateIncomeBracket,
  incomePercentage,
} from "@/lib/calculator";
import type { PolicyWithEligibility } from "@/lib/youth/types";

interface CalculatorResult {
  /** 입력한 월 소득 (만원) */
  incomeManwon: number;
  /** 중위소득 구간 (예: "50%이하") */
  incomeBracket: string;
  /** 중위소득 대비 % */
  incomePercent: number;
  /** 신청 가능한 정책 수 */
  matchedPoliciesCount: number;
  /** 예상 지원금액 합계 (만원) */
  totalBenefit: number;
  /** 금액이 확인된 정책 수 */
  countedPolicies: number;
  /** 신청 가능한 정책 목록 (상위) */
  policies: PolicyWithEligibility[];
}

function DDayText({ dDay }: { dDay: number | null }) {
  if (dDay === null) return <span className="dday safe">상시</span>;
  if (dDay < 0) return <span className="dday safe">마감</span>;
  if (dDay <= 14) return <span className="dday">D-{dDay}</span>;
  return <span className="dday safe">D-{dDay}</span>;
}

export function IncomeCalculator() {
  const { profile, loaded } = useProfile();
  const [incomeInput, setIncomeInput] = useState("");
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 온보딩에서 입력한 월 소득이 있으면 미리 채워줌
  useEffect(() => {
    if (loaded && profile?.income !== undefined) {
      setIncomeInput((prev) => (prev === "" ? String(profile.income) : prev));
    }
  }, [loaded, profile]);

  const formatCurrency = (value: string) =>
    value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const income = parseInt(incomeInput.replace(/,/g, ""), 10);
      if (Number.isNaN(income) || income < 0) {
        throw new Error("올바른 소득을 입력하세요");
      }

      // 중위소득 % 판정 (만원 → 원 환산 후 월 기준 중위소득과 비교)
      const incomeWon = income * 10_000;
      const incomeBracket = calculateIncomeBracket(incomeWon);
      const incomePercent = incomePercentage(incomeWon);

      // 소득 조건으로 신청 가능한 정책 조회 (온통청년 프록시)
      const q = new URLSearchParams({
        income: String(income),
        eligibleOnly: "true",
        size: "20",
        page: "1",
      });
      const res = await fetch(`/api/policies?${q.toString()}`);
      if (!res.ok) throw new Error("계산에 실패했습니다");
      const data = await res.json();

      setResult({
        incomeManwon: income,
        incomeBracket,
        incomePercent,
        matchedPoliciesCount: data.totalCount ?? 0,
        totalBenefit: data.estimatedTotal ?? 0,
        countedPolicies: data.estimatedCount ?? 0,
        policies: (data.items ?? []) as PolicyWithEligibility[],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 입력 폼 */}
      <div className="card">
        <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>💰 소득 입력</h3>
        <form onSubmit={handleCalculate}>
          <div className="field">
            <label>월 소득 (만원)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 250"
              value={formatCurrency(incomeInput)}
              onChange={(e) => setIncomeInput(e.target.value.replace(/[^\d]/g, ""))}
            />
            <div className="hint">
              세전 기준이에요. 국세청 소득 자료, 건강보험 소득 자료 등을 참고하세요
            </div>
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "계산 중…" : "지원 정책 확인하기 →"}
          </button>
        </form>
        {error && (
          <div className="notice" style={{ marginTop: 12, color: "var(--red)", background: "#fef2f2" }}>
            {error}
          </div>
        )}
      </div>

      {/* 결과 표시 */}
      {result && (
        <>
          {/* 예상 지원금액 요약 */}
          <div className="money-card" style={{ marginBottom: 12 }}>
            <div className="money-label">소득 조건으로 받을 수 있는 돈</div>
            <div className="money-value">약 {formatManwon(result.totalBenefit)}</div>
            <div className="money-sub">
              금액 확인된 정책 {result.countedPolicies}개 기준 최대 예상액이에요
            </div>
          </div>

          {/* 판정 요약 */}
          <div className="card">
            <div className="stat-row">
              <span className="stat-label">입력하신 소득</span>
              <span className="stat-value">
                월 {formatManwon(result.incomeManwon)}{" "}
                <small style={{ fontWeight: 400, color: "var(--text-sub)" }}>
                  (연 {formatManwon(result.incomeManwon * 12)})
                </small>
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">중위소득 기준</span>
              <span className="stat-value blue">
                {result.incomeBracket}{" "}
                <small style={{ fontWeight: 400, color: "var(--text-sub)" }}>
                  (약 {Math.round(result.incomePercent)}% · 4인 가구 월 기준)
                </small>
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">신청 가능한 정책</span>
              <span className="stat-value">
                {result.matchedPoliciesCount.toLocaleString()}개
              </span>
            </div>
          </div>

          {/* 신청 가능한 정책 목록 */}
          <div className="section-title">
            신청 가능한 정책
            <small>상위 {result.policies.length}개</small>
          </div>
          {result.policies.length === 0 ? (
            <div className="empty">조건에 맞는 정책을 찾지 못했어요.</div>
          ) : (
            result.policies.map((p) => (
              <Link key={p.id} href={`/policy/${p.id}`}>
                <div className="card policy-card">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="cat">{p.category || "기타"}</span>
                    <DDayText dDay={p.dDay} />
                  </div>
                  <div className="card-body">
                    <div style={{ minWidth: 0 }}>
                      <div className="name">{p.name}</div>
                      <div className="inst">{p.institution}</div>
                    </div>
                    {p.amount !== null && (
                      <div className="card-amount">
                        약 <b>{formatManwon(p.amount)}</b>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}

          {/* 주의사항 */}
          <div className="notice" style={{ marginTop: 16 }}>
            ⚠️ 계산 결과는 소득 조건만 고려한 것이며, 실제 자격 심사 시 다른 조건들이
            추가로 검토돼요.
            <br />• 정책별로 나이, 지역, 직업 등 추가 조건이 있을 수 있어요
            <br />• 정확한 신청 자격은 각 정책의 공식 페이지에서 확인하세요
          </div>
        </>
      )}
    </>
  );
}
