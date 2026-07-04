"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile, profileToQuery, useBookmarks } from "@/lib/storage";
import { CATEGORIES, sidoNameByCode } from "@/lib/regions";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";

function DDayBadge({ dDay }: { dDay: number | null }) {
  if (dDay === null) return <span className="dday safe">상시</span>;
  if (dDay < 0) return <span className="dday safe">마감</span>;
  if (dDay <= 14) return <span className="dday">D-{dDay}</span>;
  return <span className="dday safe">D-{dDay}</span>;
}

const PAGE_SIZE = 12;

export default function HomePage() {
  const router = useRouter();
  const { profile, loaded } = useProfile();
  const [category, setCategory] = useState<string>(""); // "" 전체, "__saved__" 별표 모음, 그 외 분류명
  const [directOnly, setDirectOnly] = useState(false);
  const [showAll, setShowAll] = useState(false); // 기본: 신청 가능한 것만
  const [items, setItems] = useState<PolicyWithEligibility[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [categoryTotals, setCategoryTotals] = useState<
    { category: string; total: number; count: number }[]
  >([]);
  const [moneyExpanded, setMoneyExpanded] = useState(false);
  const { ids: bookmarkIds } = useBookmarks();
  const [bookmarked, setBookmarked] = useState<PolicyWithEligibility[]>([]);

  // 별표(북마크)한 정책 전체 수집 — ⭐ 관심 탭과 마감임박 섹션에 사용
  useEffect(() => {
    if (!loaded || !profile || bookmarkIds.length === 0) {
      setBookmarked([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const q = profileToQuery(profile);
      const results = await Promise.all(
        bookmarkIds.map(async (id) => {
          try {
            const res = await fetch(`/api/policies/${id}${q ? `?${q}` : ""}`);
            return res.ok ? ((await res.json()) as PolicyWithEligibility) : null;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setBookmarked(results.filter((p): p is PolicyWithEligibility => p !== null));
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, profile, bookmarkIds]);

  const deadlineSoon = bookmarked
    .filter((p) => p.dDay !== null && p.dDay >= 0 && p.dDay <= 14)
    .sort((a, b) => (a.dDay ?? 99) - (b.dDay ?? 99));

  useEffect(() => {
    if (loaded && profile === null) router.replace("/onboarding");
    // 온보딩에서 고른 관심 분야가 있으면 첫 진입 시 해당 카테고리 탭 선택
    if (loaded && profile?.interests?.length) setCategory(profile.interests[0]);
  }, [loaded, profile, router]);

  const fetchList = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const q = new URLSearchParams(profileToQuery(profile));
        q.set("size", String(PAGE_SIZE));
        q.set("page", String(targetPage));
        if (category && category !== "__saved__") q.set("category", category);
        if (directOnly) q.set("directOnly", "true");
        if (!showAll) q.set("eligibleOnly", "true"); // 기본: 신청 가능한 것만
        const res = await fetch(`/api/policies?${q.toString()}`);
        const data = await res.json();
        setItems(data.items ?? []);
        setTotalCount(data.totalCount ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setEstimatedTotal(typeof data.estimatedTotal === "number" ? data.estimatedTotal : null);
        setEstimatedCount(data.estimatedCount ?? 0);
        setCategoryTotals(data.categoryTotals ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [profile, category, directOnly, showAll],
  );

  // 카테고리/바로신청 변경 시 1페이지로 리셋 (⭐ 탭은 북마크 목록 사용, API 호출 안 함)
  useEffect(() => {
    if (loaded && profile && category !== "__saved__") {
      setPage(1);
      fetchList(1);
    }
  }, [loaded, profile, category, directOnly, showAll, fetchList]);

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    fetchList(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!loaded || profile === null) {
    return <div className="loading">불러오는 중…</div>;
  }

  const regionLabel = profile.regionCode
    ? sidoNameByCode(profile.regionCode)
    : profile.sidoCode
      ? sidoNameByCode(profile.sidoCode)
      : "전국";

  // 페이지 번호 윈도우 (현재 기준 ±2)
  const pageWindow: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pageWindow.push(i);

  return (
    <>
      <div className="header">
        <h1>맞춤 청년정책</h1>
        <div className="sub">
          {regionLabel} · 총 <b>{totalCount.toLocaleString()}</b>건 ·{" "}
          <Link href="/onboarding" style={{ color: "var(--toss-blue)" }}>
            정보 수정
          </Link>{" "}
          ·{" "}
          <Link href="/saved" style={{ color: "var(--toss-blue)" }}>
            저장함
          </Link>
        </div>
      </div>

      {category !== "__saved__" && !showAll && estimatedTotal !== null && estimatedTotal > 0 && (
        <div className="section" style={{ paddingBottom: 4 }}>
          <div className="money-card">
            <div className="money-label">지금 신청하면 받을 수 있는 돈</div>
            <div className="money-value">약 {formatManwon(estimatedTotal)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div className="money-sub">
                금액 확인된 정책 {estimatedCount}개 기준 추정치예요
              </div>
              {categoryTotals.length > 0 && (
                <button
                  className="money-more"
                  onClick={() => setMoneyExpanded((v) => !v)}
                >
                  {moneyExpanded ? "접기 ▲" : "더보기 ▼"}
                </button>
              )}
            </div>
            {moneyExpanded && (
              <div className="money-breakdown">
                {categoryTotals.map((c) => (
                  <div
                    key={c.category}
                    className="money-breakdown-row"
                    onClick={() => {
                      setCategory(c.category);
                      setMoneyExpanded(false);
                    }}
                  >
                    <span>
                      {c.category} <small>({c.count}개)</small>
                    </span>
                    <b>약 {formatManwon(c.total)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {deadlineSoon.length > 0 && (
        <div style={{ paddingTop: 4 }}>
          <div className="section" style={{ paddingBottom: 6 }}>
            <b style={{ fontSize: 15 }}>⏰ 저장한 정책 마감임박</b>
          </div>
          <div className="hscroll">
            {deadlineSoon.map((p) => (
              <Link key={p.id} href={`/policy/${p.id}`}>
                <div className="mini-card">
                  <span className="dday">D-{p.dDay}</span>
                  <div className="mini-name">{p.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="tabs">
        <div
          className={`tab ${category === "__saved__" ? "active" : ""}`}
          onClick={() => setCategory("__saved__")}
        >
          ⭐ 관심 {bookmarked.length > 0 ? bookmarked.length : ""}
        </div>
        <div
          className={`tab ${category === "" ? "active" : ""}`}
          onClick={() => setCategory("")}
        >
          전체
        </div>
        {CATEGORIES.map((c) => (
          <div
            key={c}
            className={`tab ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </div>
        ))}
      </div>

      {category !== "__saved__" && (
      <div className="section" style={{ paddingBottom: 8, display: "flex", gap: 8 }}>
        <button
          className={`toggle-filter ${showAll ? "on-blue" : ""}`}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "✓ 미충족 정책 보는 중" : "미충족 정책도 보기"}
        </button>
        <button
          className={`toggle-filter ${directOnly ? "on" : ""}`}
          onClick={() => setDirectOnly((v) => !v)}
        >
          ⚡ 바로신청만
        </button>
      </div>
      )}

      <div className="section">
        {category !== "__saved__" && loading ? (
          <div className="loading">정책을 찾고 있어요…</div>
        ) : (category === "__saved__" ? bookmarked : items).length === 0 ? (
          <div className="empty">
            {category === "__saved__" ? (
              <>
                아직 별표한 정책이 없어요.
                <br />
                정책 상세에서 ☆ 를 누르면 여기에 모여요.
              </>
            ) : (
              <>
                조건에 맞는 정책이 없어요.
                <br />
                카테고리나 내 정보를 바꿔보세요.
              </>
            )}
          </div>
        ) : (
          <>
            {(category === "__saved__" ? bookmarked : items).map((p) => (
              <Link key={p.id} href={`/policy/${p.id}`}>
                <div className="card policy-card">
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="cat">{p.category || "기타"}</span>
                    <span style={{ display: "flex", gap: 4 }}>
                      {p.directApply && <span className="badge-direct">⚡바로신청</span>}
                      {p.fullMatch ? (
                        <span className="badge-full">✓ 자격충족</span>
                      ) : p.eligible ? (
                        <span className="badge-ok">신청가능</span>
                      ) : (
                        <span className="badge-warn">조건확인</span>
                      )}
                    </span>
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
                  <div className="meta">
                    {p.regionScope === "local" ? (
                      <span className="scope local">{regionLabel}</span>
                    ) : p.regionScope === "wide" ? (
                      <span className="scope">전국</span>
                    ) : null}
                    <DDayBadge dDay={p.dDay} />
                    {p.keywords.slice(0, 2).map((k) => (
                      <span key={k} className="inst">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}

            {category !== "__saved__" && totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => goPage(page - 1)} disabled={page <= 1}>
                  ‹
                </button>
                {start > 1 && <span className="pg-ellipsis">…</span>}
                {pageWindow.map((p) => (
                  <button
                    key={p}
                    className={p === page ? "pg-active" : ""}
                    onClick={() => goPage(p)}
                  >
                    {p}
                  </button>
                ))}
                {end < totalPages && <span className="pg-ellipsis">…</span>}
                <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}>
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
