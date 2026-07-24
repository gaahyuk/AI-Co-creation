"use client";

// 대시보드 — 프로필 요약 · 마감임박 알림 · 신청 현황 · 진단 결과 · 서류 준비 현황
// (참조: 장재영 브랜치 dashboard/page.js, 이윤호 브랜치 dashboard/* — 저장소만 localStorage로 포팅)

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile, profileToQuery, useBookmarks, docProgress } from "@/lib/storage";
import { sidoNameByCode, JOB_STATUSES } from "@/lib/regions";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import type { DiagnosisResult } from "@/lib/diagnosis";
import styles from "./dashboard.module.css";

/** youth.account — 로컬 계정 */
interface LocalAccount {
  name?: string;
  email?: string;
  createdAt?: string;
}

/** youth.wallet — 정책 신청/수령 기록 */
interface WalletEntry {
  policyId: string;
  policyName: string;
  status: "interested" | "applied" | "received";
  amount?: number | null; // 만원
  date?: string;
}

const MOTIVATION_MESSAGES = [
  "오늘도 한 발 더 나아가세요! 🚀",
  "당신의 꿈을 위해 지원하세요! 💪",
  "작은 신청이 큰 미래를 만들어요! ✨",
  "저장한 정책의 마감일을 확인하셨나요? 📋",
  "정책 신청은 타이밍이 중요해요! ⏰",
];

export default function DashboardPage() {
  const { profile, loaded } = useProfile();
  const { ids: bookmarkIds } = useBookmarks();

  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [wallet, setWallet] = useState<WalletEntry[]>([]);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [bookmarked, setBookmarked] = useState<PolicyWithEligibility[]>([]);
  const [bmLoading, setBmLoading] = useState(false);
  // 응원 문구는 마운트 후 1회만 뽑아 하이드레이션 불일치를 피함
  const [message, setMessage] = useState("");

  // localStorage 개인 데이터 일괄 로드 (클라이언트에서만)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("youth.account");
      if (raw) setAccount(JSON.parse(raw) as LocalAccount);
    } catch {
      /* 무시 */
    }
    try {
      const raw = localStorage.getItem("youth.wallet");
      const arr = raw ? (JSON.parse(raw) as WalletEntry[]) : [];
      setWallet(Array.isArray(arr) ? arr : []);
    } catch {
      setWallet([]);
    }
    try {
      const raw = localStorage.getItem("youth.diagnosis");
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setDiagnosis(parsed as DiagnosisResult);
        }
      }
    } catch {
      /* 무시 */
    }
    setMessage(
      MOTIVATION_MESSAGES[Math.floor(Math.random() * MOTIVATION_MESSAGES.length)],
    );
  }, []);

  // 북마크한 정책 상세 수집 — 홈(page.tsx)의 fetch 패턴과 동일
  useEffect(() => {
    if (!loaded || bookmarkIds.length === 0) {
      setBookmarked([]);
      return;
    }
    let cancelled = false;
    setBmLoading(true);
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
      setBmLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, profile, bookmarkIds]);

  if (!loaded) {
    return <div className="loading">불러오는 중…</div>;
  }

  // --- (2) 마감임박: 북마크 정책 중 D-14 이내, D-3 이내는 긴급 표시 ---
  const deadlineSoon = bookmarked
    .filter((p) => p.dDay !== null && p.dDay >= 0 && p.dDay <= 14)
    .sort((a, b) => (a.dDay ?? 99) - (b.dDay ?? 99));

  // --- (3) 신청 현황 요약 (youth.wallet) ---
  const interestedCount = wallet.filter((w) => w.status === "interested").length;
  const appliedCount = wallet.filter((w) => w.status === "applied").length;
  const receivedCount = wallet.filter((w) => w.status === "received").length;
  const receivedAmount = wallet
    .filter((w) => w.status === "received")
    .reduce((sum, w) => sum + (typeof w.amount === "number" ? w.amount : 0), 0);
  const appliedAmount = wallet
    .filter((w) => w.status === "applied")
    .reduce((sum, w) => sum + (typeof w.amount === "number" ? w.amount : 0), 0);

  // --- (5) 서류 준비율: 북마크 정책의 docProgress 합산 ---
  const docStats = bookmarked
    .map((p) => ({ policy: p, ...docProgress(p.id, p.documents) }))
    .filter((d) => d.total > 0);
  const docDone = docStats.reduce((s, d) => s + d.done, 0);
  const docTotal = docStats.reduce((s, d) => s + d.total, 0);
  const docPercent = docTotal > 0 ? Math.round((docDone / docTotal) * 100) : 0;

  // --- (1) 프로필 요약 ---
  const displayName = account?.name?.trim() || "청년";
  const regionLabel = profile?.regionCode
    ? sidoNameByCode(profile.regionCode)
    : profile?.sidoCode
      ? sidoNameByCode(profile.sidoCode)
      : "전국";
  const jobLabel = profile?.jobCode
    ? (JOB_STATUSES.find((j) => j.code === profile.jobCode)?.name ?? null)
    : null;

  // --- (4) 진단 결과 요약: diagnosis.ts DiagnosisResult 스키마(type/recommendedCategories/incomeManwon 등) 기준 ---
  const diagTitle = diagnosis ? `${diagnosis.type.emoji} ${diagnosis.type.title}` : null;
  const diagDescription = diagnosis?.type.description ?? null;
  const diagCategories = diagnosis?.recommendedCategories ?? [];
  const diagIncomeManwon = diagnosis?.incomeManwon ?? null;
  const diagIncomePercent = diagnosis?.incomePercent ?? null;
  const diagDate = diagnosis?.createdAt ?? null;

  return (
    <>
      <div className="header">
        <h1>대시보드</h1>
        <div className="sub">내 정책 여정을 한눈에 확인해요</div>
      </div>

      <div className="section">
        {/* 인사 히어로 + 서류 전체 진행률 */}
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <h2 className={styles.heroTitle}>{displayName}님, 환영해요 👋</h2>
              {message && <div className={styles.heroMsg}>{message}</div>}
            </div>
            <span className={styles.heroEmoji} aria-hidden>
              🎯
            </span>
          </div>
          {docTotal > 0 && (
            <div className={styles.heroProgress}>
              <div className={styles.heroProgressLabel}>
                <span>서류 준비 전체 진행률</span>
                <b>{docPercent}%</b>
              </div>
              <div className={styles.heroTrack}>
                <div className={styles.heroFill} style={{ width: `${docPercent}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* (1) 프로필 요약 카드 */}
        {profile ? (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>👤 내 프로필</h3>
              <Link href="/onboarding" style={{ fontSize: 13, color: "var(--toss-blue)", fontWeight: 600 }}>
                정보 수정 ›
              </Link>
            </div>
            <div style={{ marginTop: 6 }}>
              {profile.age !== undefined && (
                <div className="stat-row">
                  <span className="stat-label">나이</span>
                  <span className="stat-value">만 {profile.age}세</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label">거주 지역</span>
                <span className="stat-value">{regionLabel || "전국"}</span>
              </div>
              {jobLabel && (
                <div className="stat-row">
                  <span className="stat-label">취업 상태</span>
                  <span className="stat-value">{jobLabel}</span>
                </div>
              )}
              {profile.income !== undefined && (
                <div className="stat-row">
                  <span className="stat-label">월 소득</span>
                  <span className="stat-value">{formatManwon(profile.income)}</span>
                </div>
              )}
              {profile.interests && profile.interests.length > 0 && (
                <div className="stat-row">
                  <span className="stat-label">관심 분야</span>
                  <span style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {profile.interests.map((i) => (
                      <span key={i} className="tag blue">
                        {i}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // 프로필 미완성 경고 배너 (참조: 장재영 대시보드)
          <div className="card" style={{ borderColor: "#f59e0b", background: "#fffbeb" }}>
            <h3 style={{ margin: 0, fontSize: 15, color: "#b45309" }}>⚠️ 프로필 정보를 입력해 주세요</h3>
            <p style={{ fontSize: 13, color: "var(--text-sub)", margin: "6px 0 12px", lineHeight: 1.5 }}>
              아직 나이·거주지역 정보가 없어 정확한 정책 자격 판별을 할 수 없어요.
            </p>
            <Link href="/onboarding" className="btn small" style={{ textAlign: "center" }}>
              프로필 설정하기
            </Link>
          </div>
        )}

        {/* (3) 신청 현황 요약 */}
        <div className="section-title">💼 신청 현황</div>
        <div className={styles.statGrid}>
          <div className={styles.statTile}>
            <div className={styles.statNum}>{interestedCount}</div>
            <div className={styles.statLabel}>관심</div>
          </div>
          <div className={styles.statTile}>
            <div className={`${styles.statNum} ${styles.blue}`}>{appliedCount}</div>
            <div className={styles.statLabel}>신청 완료</div>
          </div>
          <div className={styles.statTile}>
            <div className={`${styles.statNum} ${styles.green}`}>{receivedCount}</div>
            <div className={styles.statLabel}>수령 완료</div>
          </div>
        </div>
        {wallet.length === 0 ? (
          <div className="notice">
            아직 신청 기록이 없어요. 정책 상세에서 신청하고 지갑에 기록해 보세요.
          </div>
        ) : (
          <div className="card">
            {appliedAmount > 0 && (
              <div className="stat-row">
                <span className="stat-label">신청 중 예상 금액</span>
                <span className="stat-value blue">약 {formatManwon(appliedAmount)}</span>
              </div>
            )}
            {receivedAmount > 0 && (
              <div className="stat-row">
                <span className="stat-label">지금까지 받은 금액</span>
                <span className="stat-value" style={{ color: "var(--green)" }}>
                  약 {formatManwon(receivedAmount)}
                </span>
              </div>
            )}
            {wallet.slice(0, 3).map((w, i) => (
              <div className="stat-row" key={`${w.policyId}-${i}`}>
                <span className="stat-label" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {w.policyName}
                </span>
                <span
                  className={`tag ${w.status === "received" ? "green" : w.status === "applied" ? "blue" : ""}`}
                  style={{ flex: "0 0 auto", marginLeft: 8 }}
                >
                  {w.status === "received" ? "수령" : w.status === "applied" ? "신청" : "관심"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* (2) 마감임박 알림 — 북마크 정책 중 D-14 이내 */}
        <div className="section-title">
          ⏰ 마감임박 알림
          <small>저장한 정책 기준</small>
        </div>
        {bmLoading ? (
          <div className="loading">저장한 정책을 확인하고 있어요…</div>
        ) : deadlineSoon.length === 0 ? (
          <div className="notice" style={{ color: "var(--green)", background: "#f0fdf4" }}>
            ✅ 14일 안에 마감되는 저장 정책이 없어요
          </div>
        ) : (
          <div>
            {deadlineSoon.map((p) => (
              <Link key={p.id} href={`/policy/${p.id}`}>
                <div className={`${styles.alertRow} ${(p.dDay ?? 99) <= 3 ? styles.urgent : ""}`}>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.alertName}>{p.name}</div>
                    <div className={styles.alertSub}>
                      {p.category || "기타"}
                      {p.periodEnd ? ` · ${p.periodEnd} 마감` : ""}
                    </div>
                  </div>
                  <span className={styles.alertDday}>D-{p.dDay}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* (4) 진단 결과 요약 */}
        <div className="section-title">🩺 자가진단</div>
        {diagnosis ? (
          <div className="card">
            <span className={styles.diagBadge}>진단 완료</span>
            {diagTitle && (
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>{diagTitle}</div>
            )}
            {diagDescription && (
              <p style={{ fontSize: 13, color: "var(--text-sub)", margin: "6px 0 0", lineHeight: 1.5 }}>
                {diagDescription}
              </p>
            )}
            {diagCategories.length > 0 && (
              <div className="stat-row">
                <span className="stat-label">추천 정책 분야</span>
                <span style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {diagCategories.map((c) => (
                    <span key={c} className="tag blue">
                      {c}
                    </span>
                  ))}
                </span>
              </div>
            )}
            {diagIncomePercent !== null && (
              <div className="stat-row">
                <span className="stat-label">소득 구간</span>
                <span className="stat-value">
                  {diagIncomePercent >= 200 ? "150% 초과 / 잘 모름" : `중위소득 ${diagIncomePercent}% 이하`}
                  {diagIncomeManwon ? ` (약 ${formatManwon(diagIncomeManwon)})` : ""}
                </span>
              </div>
            )}
            {diagDate && (
              <div className="stat-row">
                <span className="stat-label">진단일</span>
                <span className="stat-value">{diagDate.slice(0, 10)}</span>
              </div>
            )}
            <Link
              href="/diagnosis"
              className="btn secondary"
              style={{ marginTop: 12, padding: 12, fontSize: 14, textAlign: "center" }}
            >
              다시 진단하기
            </Link>
          </div>
        ) : (
          <div className="card">
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-sub)", lineHeight: 1.5 }}>
              아직 자가진단 기록이 없어요. 1분 진단으로 받을 수 있는 정책을 확인해 보세요.
            </p>
            <Link href="/diagnosis" className="btn small" style={{ textAlign: "center" }}>
              자가진단 하러 가기
            </Link>
          </div>
        )}

        {/* (5) 서류 준비 진행 현황 */}
        <div className="section-title">
          📂 서류 준비 현황
          <small>저장한 정책 기준</small>
        </div>
        {docStats.length === 0 ? (
          <div className="notice">
            저장한 정책의 상세 페이지에서 제출 서류를 체크하면 여기에 진행률이 모여요.
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>전체 {docDone}/{docTotal}</h3>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--toss-blue)" }}>
                {docPercent}%
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${docPercent}%` }} />
            </div>
            {docStats.map(({ policy, done, total }) => (
              <Link key={policy.id} href={`/policy/${policy.id}`}>
                <div className={styles.docRow}>
                  <div className={styles.docHead}>
                    <span className={styles.docName}>{policy.name}</span>
                    <span className={`${styles.docCount} ${done === total ? styles.done : ""}`}>
                      {done === total ? "✓ 준비 완료" : `${done}/${total}`}
                    </span>
                  </div>
                  <div className="progress-track" style={{ margin: "8px 0 0" }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${total ? (done / total) * 100 : 0}%`,
                        background: done === total ? "var(--green)" : undefined,
                      }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
