"use client";

import { useState } from "react";
import {
  simulateAsset,
  roadmapMilestones,
  formatWon,
  type AssetSimulation,
} from "@/lib/calculator";
import type { AssetProduct } from "@/lib/asset-formation-data";
import { grantReward } from "@/lib/wallet";

// 자산형성 시뮬레이터 입력·결과 (원본 asset-simulator.tsx 이식 — API 대신 순수 함수 호출)
export function AssetSimulator({ product }: { product: AssetProduct }) {
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [result, setResult] = useState<AssetSimulation | null>(null);
  const [error, setError] = useState("");

  const formatCurrency = (value: string) =>
    value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = parseInt(monthlyAmount.replace(/,/g, ""), 10);
    if (Number.isNaN(amount) || amount <= 0) {
      setError("유효한 금액을 입력하세요");
      setResult(null);
      return;
    }

    setResult(simulateAsset(product, amount));
    // 자산 형성 시뮬레이터를 처음 실행하면 배지 지급
    grantReward("asset_formation_started");
  };

  return (
    <>
      {/* 입력 폼 */}
      <div className="card">
        <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>💰 자산 형성 시뮬레이터</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-sub)" }}>
          {product.name}에 월별로 얼마나 모을 수 있는지 확인하세요
        </p>
        <form onSubmit={handleSimulate}>
          <div className="field">
            <label>월 저축/투자 금액 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={`예: ${(product.monthlyContribution ?? 100_000).toLocaleString()}`}
              value={formatCurrency(monthlyAmount)}
              onChange={(e) => setMonthlyAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
            <div className="hint">매월 규칙적으로 저축할 수 있는 금액을 입력하세요</div>
          </div>
          <button type="submit" className="btn">
            자산 형성 계산하기 →
          </button>
        </form>
        {error && (
          <div
            className="notice"
            style={{ marginTop: 12, color: "var(--red)", background: "#fef2f2" }}
          >
            {error}
          </div>
        )}
      </div>

      {/* 결과 표시 */}
      {result && (
        <>
          {/* 월별 적립 현황 */}
          <div className="card">
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>월별 적립 현황</h3>
            <div className="grid-2">
              <div style={{ background: "#eef4ff", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#1b64da" }}>내 저축</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                  {formatWon(result.monthlyAmount)}/월
                </div>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, color: "var(--green)" }}>정부 지원</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
                  {formatWon(result.governmentMonthly)}/월
                </div>
              </div>
            </div>
          </div>

          {/* 만기 예상 자산 */}
          <div className="money-card" style={{ marginBottom: 12 }}>
            <div className="money-label">{result.term}개월 후 예상 자산</div>
            <div className="money-value">{formatWon(result.totalSimulated)}</div>
            <div className="money-breakdown">
              <div className="money-breakdown-row" style={{ cursor: "default" }}>
                <span>내 저축 총액</span>
                <b>{formatWon(result.totalUserContribution)}</b>
              </div>
              <div className="money-breakdown-row" style={{ cursor: "default" }}>
                <span>정부 지원 총액</span>
                <b>{formatWon(result.totalGovernmentSupport)}</b>
              </div>
            </div>
          </div>

          {/* 자산 형성 로드맵 */}
          <div className="card">
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>자산 형성 로드맵</h3>
            {roadmapMilestones(result.term).map((month) => {
              const proportion = month / result.term;
              const accumulated = Math.floor(result.totalSimulated * proportion);
              return (
                <div key={month} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{month}개월</span>
                    <b>{formatWon(accumulated)}</b>
                  </div>
                  <div className="progress-track" style={{ margin: "6px 0 0" }}>
                    <div
                      className="progress-fill"
                      style={{ width: `${proportion * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 팁 */}
          <div className="notice" style={{ marginBottom: 12 }}>
            💡 자산 형성 팁
            <br />• 매월 정기적으로 저축하면 정부 지원금을 최대한 받을 수 있어요
            <br />• 저축 중단 시 정부 지원이 중단될 수 있으니 꾸준히 저축하세요
            <br />• 예상 자산은 정부 정책 변화에 따라 달라질 수 있어요 ({product.note})
          </div>
        </>
      )}
    </>
  );
}
