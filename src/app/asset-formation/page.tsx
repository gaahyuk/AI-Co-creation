"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ASSET_PRODUCTS } from "@/lib/asset-formation-data";
import { formatWon } from "@/lib/calculator";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import { AssetSimulator } from "./asset-simulator";

/** 선택한 상품과 관련된 정책을 온통청년 프록시에서 키워드 검색해 링크로 제공 */
function RelatedPolicies({ keyword }: { keyword: string }) {
  const [items, setItems] = useState<PolicyWithEligibility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const q = new URLSearchParams({ keyword, size: "5", page: "1" });
        const res = await fetch(`/api/policies?${q.toString()}`);
        const data = res.ok ? await res.json() : { items: [] };
        if (!cancelled) setItems((data.items ?? []) as PolicyWithEligibility[]);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [keyword]);

  return (
    <>
      <div className="section-title">
        관련 정책 찾기
        <small>&ldquo;{keyword}&rdquo; 검색 결과</small>
      </div>
      {loading ? (
        <div className="loading">관련 정책을 찾고 있어요…</div>
      ) : items.length === 0 ? (
        <div className="notice">지금은 관련 정책을 찾지 못했어요. 홈에서 직접 검색해보세요.</div>
      ) : (
        items.map((p) => (
          <Link key={p.id} href={`/policy/${p.id}`}>
            <div className="card policy-card">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="cat">{p.category || "기타"}</span>
                {p.amount !== null && (
                  <span className="card-amount">
                    약 <b>{formatManwon(p.amount)}</b>
                  </span>
                )}
              </div>
              <div className="name">{p.name}</div>
              <div className="inst">{p.institution}</div>
            </div>
          </Link>
        ))
      )}
    </>
  );
}

// 자산형성 시뮬레이터 (이윤호 브랜치 /asset-formation 이식 — 계산은 전부 클라이언트에서)
export default function AssetFormationPage() {
  const [selectedId, setSelectedId] = useState(ASSET_PRODUCTS[0].id);
  const product = ASSET_PRODUCTS.find((p) => p.id === selectedId) ?? ASSET_PRODUCTS[0];

  const infoTile = (label: string, value: string, bg: string, color: string) => (
    <div style={{ background: bg, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );

  return (
    <>
      <div className="header">
        <Link href="/menu" style={{ color: "var(--text-sub)", fontSize: 14 }}>
          ‹ 전체 메뉴
        </Link>
        <h1 style={{ marginTop: 8 }}>자산형성 시뮬레이터</h1>
        <div className="sub">정부 지원으로 더 효과적으로 자산을 만들어보세요</div>
      </div>

      {/* 상품 선택 탭 */}
      <div className="tabs">
        {ASSET_PRODUCTS.map((p) => (
          <div
            key={p.id}
            className={`tab ${p.id === selectedId ? "active" : ""}`}
            onClick={() => setSelectedId(p.id)}
          >
            {p.name}
          </div>
        ))}
      </div>

      <div className="section">
        {/* 상품 정보 */}
        <div className="card">
          <div style={{ fontSize: 17, fontWeight: 700 }}>{product.name}</div>
          <div className="inst" style={{ marginBottom: 10 }}>{product.institution}</div>
          <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.6, color: "#333d4b" }}>
            {product.description}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {product.monthlyContribution !== null &&
              infoTile(
                "권장 월 저축",
                formatWon(product.monthlyContribution),
                "#eef4ff",
                "#1b64da",
              )}
            {product.governmentSupport !== null &&
              infoTile(
                "정부 월 지원",
                formatWon(product.governmentSupport),
                "#f0fdf4",
                "var(--green)",
              )}
            {product.term !== null &&
              infoTile("기간", `${product.term}개월`, "#f2f4f6", "var(--text-sub)")}
          </div>
        </div>

        {/* 시뮬레이터 */}
        <AssetSimulator key={product.id} product={product} />

        {/* 관련 정책 검색 링크 */}
        <RelatedPolicies keyword={product.keyword} />
      </div>
    </>
  );
}
