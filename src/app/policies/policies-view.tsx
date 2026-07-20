"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toggleInterest } from "@/lib/actions/tracking";
import { formatManwon } from "@/lib/format";
import { PolicyTipPanel } from "./policy-tip-panel";
import { PolicyComparison } from "./policy-comparison";
import { PolicyListSkeleton, HeroSkeleton } from "@/components/skeleton-loader";

export type MatchTier = "full" | "partial" | "needs_check" | "excluded";

export type PolicyCard = {
  id: string;
  category: string;
  title: string;
  amount: number | null;
  org: string | null;
  regionLabel: string;
  dday: { label: string; urgent: boolean } | null;
  applyEndAt: number | null; // 정렬용 마감 타임스탬프. null이면 상시모집.
  hasApplyUrl: boolean;
  applyUrl: string | null;
  detailUrl: string | null; // 신청 URL이 없을 때 안내할 공식 상세페이지
  keywords: string[];
  tier: MatchTier;
  interested: boolean;
  reasons: string[];
  docs: { name: string; owned: boolean }[];
  urgentTipCount: number;
};

// 정책 소개/지원내용/제출서류 원문 — 목록 페이로드를 가볍게 유지하려고
// 카드를 펼칠 때 /api/policies/[id]/detail 에서 지연 조회한다.
type PolicyDetail = {
  description: string | null;
  supportContent: string | null;
  docsText: string | null;
};

export type CategorySummary = { category: string; count: number; amount: number };

export type Summary = {
  regionLabel: string;
  matchedCount: number;
  amountConfirmedCount: number;
  totalAmount: number;
  byCategory: CategorySummary[];
};

const CATEGORIES = ["일자리", "주거", "교육", "복지문화", "참여권리"] as const;

const TIER_BADGE: Record<MatchTier, { label: string; className: string } | null> = {
  full: { label: "✓ 자격충족", className: "bg-emerald-100 text-emerald-700" },
  partial: { label: "부분 충족", className: "bg-amber-100 text-amber-700" },
  needs_check: { label: "확인 필요", className: "bg-slate-200 text-slate-600" },
  excluded: { label: "미충족", className: "bg-slate-100 text-slate-400" },
};

// 카테고리별 색상 — 카드 좌측 액센트 바와 태그에 사용해 목록에 색 변화를 준다.
const CATEGORY_COLOR: Record<string, { tag: string; bar: string }> = {
  일자리: { tag: "bg-blue-50 text-blue-600", bar: "bg-blue-500" },
  주거: { tag: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  교육: { tag: "bg-violet-50 text-violet-600", bar: "bg-violet-500" },
  복지문화: { tag: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
  참여권리: { tag: "bg-teal-50 text-teal-600", bar: "bg-teal-500" },
};

function categoryColor(category: string) {
  return CATEGORY_COLOR[category] ?? { tag: "bg-slate-100 text-slate-600", bar: "bg-slate-400" };
}

const TIER_ORDER: Record<MatchTier, number> = {
  full: 0,
  partial: 1,
  needs_check: 2,
  excluded: 3,
};

type SortMode = "match" | "deadline" | "amount";

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: "match", label: "추천순" },
  { mode: "deadline", label: "마감임박순" },
  { mode: "amount", label: "금액순" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-600/30"
          : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600"
      }`}
    >
      {children}
    </button>
  );
}

export function PoliciesView({
  summary,
  cards,
}: {
  summary: Summary;
  cards: PolicyCard[];
}) {
  const [category, setCategory] = useState<string>("전체");
  const [showUnmet, setShowUnmet] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);
  const [heroOpen, setHeroOpen] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("match");
  const [details, setDetails] = useState<Record<string, PolicyDetail | "loading">>({});
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = cards.filter((c) => {
      if (category === "관심") return c.interested;
      if (c.tier === "excluded" && !showUnmet) return false;
      if (category !== "전체" && c.category !== category) return false;
      if (directOnly && !c.hasApplyUrl) return false;
      if (q) {
        const haystack = `${c.title} ${c.org ?? ""} ${c.keywords.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortMode === "deadline") {
      // 마감임박순: 마감일이 있는 정책을 가까운 순으로, 상시모집(null)은 맨 뒤로.
      return rows.sort((a, b) => {
        if (a.applyEndAt == null && b.applyEndAt == null) return a.title.localeCompare(b.title, "ko");
        if (a.applyEndAt == null) return 1;
        if (b.applyEndAt == null) return -1;
        return a.applyEndAt - b.applyEndAt;
      });
    }
    if (sortMode === "amount") {
      // 금액순: 금액이 확인된 정책을 큰 순으로, 확인 안 된 정책은 맨 뒤로.
      return rows.sort((a, b) => {
        if (a.amount == null && b.amount == null) return a.title.localeCompare(b.title, "ko");
        if (a.amount == null) return 1;
        if (b.amount == null) return -1;
        return b.amount - a.amount;
      });
    }
    return rows.sort(
      (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.title.localeCompare(b.title, "ko")
    );
  }, [cards, category, showUnmet, directOnly, query, sortMode]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (!details[id]) {
      setDetails((prev) => ({ ...prev, [id]: "loading" }));
      fetch(`/api/policies/${id}/detail`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: PolicyDetail | null) => {
          setDetails((prev) => ({
            ...prev,
            [id]: data ?? { description: null, supportContent: null, docsText: null },
          }));
        })
        .catch(() => {
          setDetails((prev) => ({
            ...prev,
            [id]: { description: null, supportContent: null, docsText: null },
          }));
        });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-6 lg:max-w-6xl">
      {/* 상단 네비게이션 */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-200 px-4 py-3 text-center font-semibold text-slate-600 hover:bg-slate-50"
        >
          🏠 대시보드
        </Link>
        <Link
          href="/policies"
          className="rounded-lg bg-violet-100 px-4 py-3 text-center font-semibold text-violet-600 hover:bg-violet-200"
        >
          📋 정책 목록
        </Link>
        <Link
          href="/timelines"
          className="rounded-lg border border-slate-200 px-4 py-3 text-center font-semibold text-slate-600 hover:bg-slate-50"
        >
          📅 타임라인
        </Link>
        <Link
          href="/calculator"
          className="rounded-lg border border-slate-200 px-4 py-3 text-center font-semibold text-slate-600 hover:bg-slate-50"
        >
          💰 계산기
        </Link>
        <Link
          href="/asset-formation"
          className="rounded-lg border border-slate-200 px-4 py-3 text-center font-semibold text-slate-600 hover:bg-slate-50"
        >
          💎 자산 형성
        </Link>
      </div>

      {/* 헤더 */}
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">맞춤 청년정책</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{summary.regionLabel}</span>
          <span>·</span>
          <span>전체 매칭 {summary.matchedCount.toLocaleString()}건</span>
          <span>·</span>
          <Link href="/profile" className="text-blue-600 hover:underline">
            정보 수정
          </Link>
          <span>·</span>
          <button
            type="button"
            onClick={() => setCategory("관심")}
            className="text-blue-600 hover:underline"
          >
            저장함
          </button>
        </p>
      </header>

      {/* 히어로 요약 카드 */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 text-white shadow-xl shadow-indigo-600/25">
        {/* 장식용 원 */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 -left-6 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-indigo-100">
              <span>💰</span> 지금 신청하면 받을 수 있는 돈
            </p>
            <p className="mt-2 text-[2rem] font-extrabold leading-none tracking-tight">
              약 {formatManwon(summary.totalAmount)}
            </p>
            <p className="mt-2 text-xs text-indigo-200">
              금액 확인된 정책 {summary.amountConfirmedCount}개의 금액을 단순 합산한 추정치예요.
              <br />
              정책마다 1회성·월지급·한도액 등 성격이 달라 실제 수령액과 다를 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHeroOpen((v) => !v)}
            className="rounded-full border border-white/40 px-3 py-1 text-xs font-medium hover:bg-white/10"
          >
            {heroOpen ? "접기 ▲" : "펼치기 ▼"}
          </button>
        </div>

        {heroOpen && summary.byCategory.length > 0 && (
          <ul className="relative mt-5 flex flex-col gap-1 border-t border-white/20 pt-4">
            {summary.byCategory.map((c) => (
              <li
                key={c.category}
                className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm hover:bg-white/10"
              >
                <span>
                  {c.category}{" "}
                  <span className="text-indigo-200">({c.count}개)</span>
                </span>
                <span className="font-semibold">약 {formatManwon(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 검색 */}
      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="정책명, 기관, 키워드로 검색"
          className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {/* 카테고리 칩 */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip active={category === "관심"} onClick={() => setCategory("관심")}>
          ⭐ 관심
        </Chip>
        <Chip active={category === "전체"} onClick={() => setCategory("전체")}>
          전체
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {/* 토글 */}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowUnmet((v) => !v)}
          className={`rounded-full border py-2.5 text-sm font-medium transition-colors ${
            showUnmet
              ? "border-slate-800 bg-slate-800 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          미충족 정책도 보기
        </button>
        <button
          type="button"
          onClick={() => setDirectOnly((v) => !v)}
          className={`rounded-full border py-2.5 text-sm font-medium transition-colors ${
            directOnly
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          ⚡ 바로신청만
        </button>
      </div>

      {/* 정렬 + 결과 수 + 비교 모드 */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">표시 중 {visible.length.toLocaleString()}건</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCompareMode((v) => !v);
              if (compareMode) setCompareIds(new Set());
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              compareMode
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
            }`}
          >
            {compareMode ? "비교 종료" : "⚖️ 정책 비교"}
          </button>
          <div className="flex gap-1 rounded-full bg-slate-100 p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => setSortMode(opt.mode)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sortMode === opt.mode
                    ? "bg-white text-violet-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 비교 모드 안내 바 */}
      {compareMode && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-sm">
          <span className="text-violet-700">
            비교할 정책을 2~5개 선택하세요 ({compareIds.size}/5)
          </span>
        </div>
      )}

      {/* 비교 결과 패널 */}
      {compareMode && compareIds.size >= 2 && (
        <div className="mb-5">
          <PolicyComparison selectedPolicies={[...compareIds]} />
        </div>
      )}

      {/* 정책 카드 목록 */}
      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {query.trim()
            ? `"${query}"에 대한 검색 결과가 없어요.`
            : category === "관심"
              ? "저장한 정책이 없어요. 관심 가는 정책을 저장해보세요."
              : "조건에 맞는 정책이 없어요."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => {
            const badge = TIER_BADGE[c.tier];
            const isOpen = expanded.has(c.id);
            const color = categoryColor(c.category);
            return (
              <li
                key={c.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* 카테고리 색상 좌측 액센트 바 */}
                <span className={`absolute inset-y-0 left-0 w-1.5 ${color.bar}`} />

                {/* 비교 모드 체크박스 */}
                {compareMode && (
                  <label className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-600 shadow-sm">
                    <input
                      type="checkbox"
                      checked={compareIds.has(c.id)}
                      onChange={() => toggleCompare(c.id)}
                      disabled={!compareIds.has(c.id) && compareIds.size >= 5}
                      className="h-3.5 w-3.5 accent-violet-600"
                    />
                    비교
                  </label>
                )}

                {/* 상단: 카테고리 + 배지 */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color.tag}`}>
                    {c.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {c.hasApplyUrl && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                        ⚡ 바로신청
                      </span>
                    )}
                    {badge && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* 제목 + 금액 */}
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/policies/${c.id}`}
                    className="text-base font-bold leading-snug text-slate-900 hover:text-violet-600 transition-colors"
                  >
                    {c.title}
                  </Link>
                  {c.amount != null && (
                    <span className="whitespace-nowrap text-base font-extrabold text-violet-600">
                      약 {formatManwon(c.amount)}
                    </span>
                  )}
                </div>
                {c.org && <p className="mt-1 text-sm text-slate-400">{c.org}</p>}

                {/* 하단: 지역 · 마감 · 해시태그 */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
                    {c.regionLabel}
                  </span>
                  {c.dday ? (
                    <span
                      className={`rounded px-1.5 py-0.5 font-semibold ${
                        c.dday.urgent
                          ? "bg-red-100 text-red-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.dday.label}
                    </span>
                  ) : (
                    <span className="rounded bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-600">
                      상시모집
                    </span>
                  )}
                  {c.keywords.slice(0, 3).map((k) => (
                    <span key={k} className="text-slate-400">
                      #{k}
                    </span>
                  ))}
                </div>

                {/* 액션 */}
                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <form action={toggleInterest.bind(null, c.id)}>
                    <button
                      type="submit"
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        c.interested
                          ? "border-violet-200 bg-violet-50 text-violet-600"
                          : "border-slate-200 text-slate-600 hover:border-violet-200"
                      }`}
                    >
                      {c.interested ? "⭐ 저장됨" : "☆ 저장"}
                    </button>
                  </form>
                  {c.applyUrl ? (
                    <a
                      href={c.applyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                    >
                      신청 페이지 →
                    </a>
                  ) : (
                    c.detailUrl && (
                      <a
                        href={c.detailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50"
                      >
                        신청방법 보기 →
                      </a>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.id)}
                    className="ml-auto text-xs text-slate-400 hover:text-slate-600"
                  >
                    필요서류·조건 {isOpen ? "접기 ▲" : "보기 ▾"}
                  </button>
                </div>

                {/* 상세: 조건 사유 + 증빙서류 + 제보 */}
                {isOpen && (() => {
                  const detail = details[c.id];
                  const detailLoading = detail === "loading";
                  const loaded = detail && detail !== "loading" ? detail : null;
                  return (
                  <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
                    {detailLoading && (
                      <p className="text-xs text-slate-400">불러오는 중...</p>
                    )}

                    {loaded && (loaded.description || loaded.supportContent) && (
                      <div className="flex flex-col gap-2.5 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                        {loaded.description && (
                          <div>
                            <p className="mb-1 font-semibold text-slate-700">📋 정책 소개</p>
                            <p className="whitespace-pre-line">{loaded.description}</p>
                          </div>
                        )}
                        {loaded.supportContent && (
                          <div>
                            <p className="mb-1 font-semibold text-slate-700">💵 지원 내용</p>
                            <p className="whitespace-pre-line">{loaded.supportContent}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {c.reasons.length > 0 && (
                      <ul className="list-inside list-disc text-sm text-slate-600">
                        {c.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}

                    {(c.docs.length > 0 || loaded?.docsText) && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="mb-1.5 text-xs font-semibold text-slate-700">
                          📄 필요 증빙서류
                        </p>
                        {c.docs.length > 0 && (
                          <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {c.docs.map((d) => (
                              <li
                                key={d.name}
                                className={d.owned ? "text-emerald-600" : "text-slate-500"}
                              >
                                {d.owned ? "✅" : "⬜"} {d.name}
                              </li>
                            ))}
                          </ul>
                        )}
                        {loaded?.docsText && (
                          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-500">
                            {loaded.docsText}
                          </p>
                        )}
                        <Link
                          href="/documents"
                          className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                        >
                          서류함에서 준비하기 →
                        </Link>
                      </div>
                    )}

                    {c.detailUrl && (
                      <div className="rounded-xl bg-violet-50 p-3 text-xs text-slate-600">
                        {!c.applyUrl && (
                          <p className="mb-1.5 text-slate-500">
                            이 정책은 온라인 바로신청 링크가 없어요. 아래 공식 페이지에서
                            신청방법·문의처를 확인하세요.
                          </p>
                        )}
                        <a
                          href={c.detailUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-violet-600 hover:underline"
                        >
                          🔗 온통청년 공식 상세페이지에서 보기 →
                        </a>
                      </div>
                    )}

                    <PolicyTipPanel policyId={c.id} initialUrgentCount={c.urgentTipCount} />
                  </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
