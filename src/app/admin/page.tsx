"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import NewsForm from "./NewsForm";
import StorageManager from "./StorageManager";

// 관리자 페이지 — 원본(장재영 브랜치 admin의 Sync Engine/정책 현황,
// 이윤호 브랜치 admin의 현황 대시보드/뉴스 등록/데이터 삭제)을
// 인증·DB 없는 베이스 아키텍처(온통청년 API 프록시 + localStorage)로 이식.

export default function AdminPage() {
  // 데이터 현황
  const [policyCount, setPolicyCount] = useState<number | null>(null);
  const [policyError, setPolicyError] = useState(false);
  const [newsCount, setNewsCount] = useState(0);
  const [localKeyCount, setLocalKeyCount] = useState(0);
  const [localSize, setLocalSize] = useState(0);

  // 정책 데이터 새로고침(원본의 "실시간 공공 API 수집 트리거")
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const [refreshErr, setRefreshErr] = useState("");

  // 로컬 데이터가 전체 초기화되면 뉴스 폼 목록도 다시 읽도록 리마운트용 키
  const [newsFormKey, setNewsFormKey] = useState(0);

  /** localStorage(youth.*) 현황 집계 */
  const readLocalStats = useCallback(() => {
    if (typeof window === "undefined") return;
    let count = 0;
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("youth.")) continue;
      count++;
      size += (localStorage.getItem(key) ?? "").length;
    }
    let news = 0;
    try {
      const raw = localStorage.getItem("youth.news.custom");
      const arr = raw ? JSON.parse(raw) : [];
      news = Array.isArray(arr) ? arr.length : 0;
    } catch {
      news = 0;
    }
    setLocalKeyCount(count);
    setLocalSize(size);
    setNewsCount(news);
  }, []);

  /** 온통청년 API 프록시에서 전체 정책 수 조회 */
  const fetchPolicyCount = useCallback(async (): Promise<number> => {
    const res = await fetch("/api/policies?size=1&page=1");
    if (!res.ok) throw new Error("API 응답 오류");
    const data = (await res.json()) as { totalCount?: number; error?: string };
    if (data.error || typeof data.totalCount !== "number") {
      throw new Error(data.error ?? "정책 수를 확인할 수 없어요");
    }
    return data.totalCount;
  }, []);

  useEffect(() => {
    readLocalStats();
    let cancelled = false;
    (async () => {
      try {
        const count = await fetchPolicyCount();
        if (!cancelled) setPolicyCount(count);
      } catch {
        if (!cancelled) setPolicyError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readLocalStats, fetchPolicyCount]);

  /** 정책 데이터 새로고침 트리거 */
  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg("");
    setRefreshErr("");
    try {
      const count = await fetchPolicyCount();
      setPolicyCount(count);
      setPolicyError(false);
      setRefreshMsg(
        `🔄 온통청년 API에서 총 ${count.toLocaleString()}건의 정책을 확인했어요 (${new Date().toLocaleTimeString("ko-KR")} 기준)`,
      );
    } catch (err) {
      setRefreshErr(err instanceof Error ? err.message : "새로고침에 실패했어요.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <div className="header">
        <h1>🛠️ 관리자</h1>
        <div className="sub">
          데이터 현황을 확인하고 뉴스·로컬 데이터를 관리해요 ·{" "}
          <Link href="/" style={{ color: "var(--toss-blue)" }}>
            홈으로
          </Link>
        </div>
      </div>

      <div className="section">
        {/* ------- 데이터 현황 대시보드 ------- */}
        <div className="section-title">데이터 현황</div>
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>정책 데이터 (온통청년 API)</div>
            <div className={styles.statValue}>
              {policyError ? (
                <span style={{ fontSize: 14, color: "var(--red)" }}>조회 실패</span>
              ) : policyCount === null ? (
                <span style={{ fontSize: 14, color: "var(--text-sub)" }}>조회 중…</span>
              ) : (
                <>
                  {policyCount.toLocaleString()}
                  <small>건</small>
                </>
              )}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>등록한 뉴스</div>
            <div className={styles.statValue}>
              {newsCount}
              <small>건</small>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>로컬 데이터 키</div>
            <div className={styles.statValue}>
              {localKeyCount}
              <small>개</small>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>로컬 저장 용량</div>
            <div className={styles.statValue}>
              {((localSize * 2) / 1024).toFixed(1)}
              <small>KB</small>
            </div>
          </div>
        </div>

        {/* ------- 정책 데이터 새로고침 ------- */}
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700 }}>🔄 정책 데이터 새로고침</div>
          <p style={{ fontSize: 13, color: "var(--text-sub)", margin: "6px 0 12px", lineHeight: 1.5 }}>
            온통청년 Open API를 다시 호출해 최신 정책 현황을 확인해요. 이 앱은 정책을
            별도 DB에 저장하지 않고 항상 API에서 실시간으로 가져와요.
          </p>
          <button type="button" className="btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "새로고침 중…" : "🚀 최신 정책 데이터 확인"}
          </button>
          {refreshMsg && <div className={styles.msgOk}>{refreshMsg}</div>}
          {refreshErr && <div className={styles.msgErr}>⚠️ {refreshErr}</div>}
        </div>

        {/* ------- 뉴스 등록 ------- */}
        <div className="section-title">
          📰 뉴스 등록 <small>정책 뉴스 페이지에 노출돼요</small>
        </div>
        <div className="card">
          <NewsForm key={newsFormKey} onChange={readLocalStats} />
        </div>

        {/* ------- 로컬 데이터 관리 ------- */}
        <div className="section-title">
          🗂️ 로컬 데이터 관리 <small>브라우저 localStorage(youth.*)</small>
        </div>
        <div className="card">
          <StorageManager
            onChange={() => {
              readLocalStats();
              setNewsFormKey((v) => v + 1); // 뉴스 키가 지워졌을 수 있으니 폼 목록 재로딩
            }}
          />
        </div>

        <div className="notice" style={{ marginTop: 8 }}>
          이 관리자 페이지는 별도 로그인 없이 이 브라우저의 데이터만 관리해요. 서버에는
          어떤 데이터도 저장되지 않아요.
        </div>
      </div>
    </>
  );
}
