"use client";

// 🔎 정책 검색 — 키워드로 정책을 찾고 카테고리·지역으로 좁힌다.
// (원본: 이윤호 브랜치 /api/search 의 title/description/keywords OR 검색을 베이스에 포팅)
// 베이스에는 별도 검색 API가 없어, /api/policies 로 카테고리·지역 후보를 받아
// 키워드는 클라이언트에서 이름·설명·키워드·지원내용·기관 전반으로 필터링한다.
// 최근 검색어는 localStorage(youth.search.recent)에 저장한다.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useProfile, profileToQuery } from "@/lib/storage";
import { CATEGORIES, SIDO_LIST, sidoNameByCode } from "@/lib/regions";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import styles from "./search.module.css";

const RECENT_KEY = "youth.search.recent";
const RECENT_MAX = 8;
const CANDIDATE_SIZE = 100; // 후보로 받아올 정책 수 (클라이언트 키워드 필터 대상)
const PAGE_STEP = 12; // "더 보기" 단위

/** D-Day 배지 (홈과 동일 스타일) */
function DDayBadge({ dDay }: { dDay: number | null }) {
  if (dDay === null) return <span className="dday safe">상시</span>;
  if (dDay < 0) return <span className="dday safe">마감</span>;
  if (dDay <= 14) return <span className="dday">D-{dDay}</span>;
  return <span className="dday safe">D-{dDay}</span>;
}

/** 최근 검색어 로드 (클라이언트 전용) */
function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** 키워드가 정책의 주요 텍스트 필드 어딘가에 포함되는지 (대소문자·공백 무시) */
function matchesKeyword(policy: PolicyWithEligibility, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    policy.name,
    policy.description,
    policy.supportContent,
    policy.institution,
    ...policy.keywords,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export default function SearchPage() {
  const { profile } = useProfile();
  const [input, setInput] = useState(""); // 입력창 값
  const [query, setQuery] = useState(""); // 실제 검색된 키워드
  const [category, setCategory] = useState(""); // "" = 전체
  const [sido, setSido] = useState(""); // "" = 전국
  const [candidates, setCandidates] = useState<PolicyWithEligibility[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [visible, setVisible] = useState(PAGE_STEP);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const persistRecent = useCallback((next: string[]) => {
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* 저장 실패는 무시 */
    }
  }, []);

  const addRecent = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      const next = [t, ...recent.filter((r) => r !== t)].slice(0, RECENT_MAX);
      persistRecent(next);
    },
    [recent, persistRecent],
  );

  const removeRecent = (term: string) => {
    persistRecent(recent.filter((r) => r !== term));
  };

  const clearRecent = () => persistRecent([]);

  // 후보 정책 수집 — 카테고리·지역은 API 서버 필터, 키워드는 클라이언트에서 필터
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(profileToQuery(profile));
      q.set("size", String(CANDIDATE_SIZE));
      q.set("page", "1");
      if (category) q.set("category", category);
      const res = await fetch(`/api/policies?${q.toString()}`);
      const data = await res.json();
      setCandidates(data.items ?? []);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [profile, category]);

  /** 검색 실행: 키워드 확정 + 최근 검색어 저장 + 후보 갱신 */
  const doSearch = (term: string) => {
    const t = term.trim();
    setQuery(t);
    setVisible(PAGE_STEP);
    setSearched(true);
    if (t) addRecent(t);
    fetchCandidates();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(input);
  };

  // 이미 검색한 뒤 카테고리 필터를 바꾸면 후보를 다시 받는다 (지역은 프로필 기반이라 재조회 불필요하지만 통일)
  useEffect(() => {
    if (searched) fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // 지역(시도) 클라이언트 필터: 후보의 regionCodes 중 선택 시도에 속한 코드가 있거나, 전국 정책이면 통과
  const regionOk = (p: PolicyWithEligibility) => {
    if (!sido) return true;
    if (p.regionCodes.length === 0) return true; // 전국
    return p.regionCodes.some((c) => c.slice(0, 2) === sido);
  };

  const results = candidates.filter((p) => matchesKeyword(p, query) && regionOk(p));
  const shown = results.slice(0, visible);

  const regionLabel = profile?.regionCode
    ? sidoNameByCode(profile.regionCode)
    : profile?.sidoCode
      ? sidoNameByCode(profile.sidoCode)
      : "전국";

  return (
    <>
      <div className="header">
        <h1>🔎 정책 검색</h1>
        <div className="sub">키워드로 원하는 청년정책을 찾아보세요</div>
      </div>

      {/* 검색 입력 바 */}
      <form className={styles.searchBar} onSubmit={onSubmit}>
        <div className={styles.searchInputWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="예: 월세, 창업, 대출, 취업"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input && (
            <button
              type="button"
              className={styles.clearBtn}
              aria-label="지우기"
              onClick={() => setInput("")}
            >
              ✕
            </button>
          )}
        </div>
        <button type="submit" className={styles.searchBtn}>
          검색
        </button>
      </form>

      {/* 카테고리 필터 탭 */}
      <div className="tabs">
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

      {/* 지역 필터 */}
      <div className="section" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <select
          className={styles.regionSelect}
          value={sido}
          onChange={(e) => setSido(e.target.value)}
        >
          <option value="">전국 (지역 무관)</option>
          {SIDO_LIST.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* 검색 전: 최근 검색어 안내 */}
      {!searched && (
        <div className="section" style={{ paddingTop: 8 }}>
          {recent.length > 0 ? (
            <>
              <div className={styles.recentHead}>
                <span className={styles.recentTitle}>최근 검색어</span>
                <button className={styles.recentClear} onClick={clearRecent}>
                  전체 삭제
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {recent.map((term) => (
                  <span key={term} className={styles.recentChip}>
                    <span
                      onClick={() => {
                        setInput(term);
                        doSearch(term);
                      }}
                    >
                      {term}
                    </span>
                    <button
                      className={styles.recentChipDel}
                      aria-label={`${term} 삭제`}
                      onClick={() => removeRecent(term)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">
              찾고 싶은 정책의 키워드를 입력해보세요.
              <br />
              지역·분야로도 좁혀서 찾을 수 있어요.
            </div>
          )}
        </div>
      )}

      {/* 검색 후: 결과 */}
      {searched && (
        <div className="section" style={{ paddingBottom: 72 }}>
          {loading ? (
            <div className="loading">정책을 찾고 있어요…</div>
          ) : results.length === 0 ? (
            <div className="empty">
              {query ? (
                <>
                  “{query}”에 대한 결과가 없어요.
                  <br />
                  다른 키워드나 분야로 다시 검색해보세요.
                </>
              ) : (
                <>
                  조건에 맞는 정책이 없어요.
                  <br />
                  분야나 지역을 바꿔보세요.
                </>
              )}
            </div>
          ) : (
            <>
              <div className={styles.resultSummary}>
                {query && (
                  <>
                    “<b>{query}</b>” ·{" "}
                  </>
                )}
                총 <b>{results.length}</b>건
                {sido && ` · ${sidoNameByCode(sido)}`}
              </div>

              {shown.map((p) => (
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

              {visible < results.length && (
                <button
                  className={styles.moreBtn}
                  onClick={() => setVisible((v) => v + PAGE_STEP)}
                >
                  더 보기 ({results.length - visible}건)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
