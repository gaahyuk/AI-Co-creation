"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile, profileToQuery, useBookmarks } from "@/lib/storage";
import {
  rankPolicies,
  extractDiagnosisInterests,
  type ScoredPolicy,
} from "@/lib/matching-engine";
import { formatManwon } from "@/lib/format";
import { normalizeCategory } from "@/lib/regions";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import styles from "./recommendations.module.css";

const DIAGNOSIS_KEY = "youth.diagnosis";

/** 자가진단 결과(youth.diagnosis)에서 관심 분야를 읽는다 (없거나 형태가 달라도 안전) */
function loadDiagnosisInterests(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DIAGNOSIS_KEY);
    return raw ? extractDiagnosisInterests(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export default function PersonalizedRecommendations() {
  const { profile, loaded } = useProfile();
  const { ids: bookmarkIds } = useBookmarks();
  const [diagnosisInterests, setDiagnosisInterests] = useState<string[]>([]);
  const [hasDiagnosis, setHasDiagnosis] = useState(false);
  const [policies, setPolicies] = useState<PolicyWithEligibility[]>([]);
  const [loading, setLoading] = useState(true);

  // 자가진단 결과 로드 (localStorage — 클라이언트에서만)
  useEffect(() => {
    setDiagnosisInterests(loadDiagnosisInterests());
    try {
      setHasDiagnosis(localStorage.getItem(DIAGNOSIS_KEY) !== null);
    } catch {
      setHasDiagnosis(false);
    }
  }, []);

  // 후보 정책 수집 — /api/policies에서 가져와 클라이언트에서 매칭엔진으로 스코어링
  useEffect(() => {
    if (!loaded) return;
    if (!profile) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams(profileToQuery(profile));
        q.set("size", "100");
        q.set("page", "1");
        const res = await fetch(`/api/policies?${q.toString()}`);
        const data = await res.json();
        if (!cancelled) setPolicies(data.items ?? []);
      } catch {
        if (!cancelled) setPolicies([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, profile]);

  if (!loaded || loading) {
    return <div className="loading">추천 정책을 분석 중이에요…</div>;
  }

  // 프로필이 없으면 온보딩 유도 (원본의 "프로필 완성하기" 포팅)
  if (!profile) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 32 }}>👤</div>
        <p style={{ fontSize: 14, color: "var(--text-sub)", margin: "12px 0 16px" }}>
          맞춤 추천을 받으려면 내 정보를 먼저 입력해주세요.
        </p>
        <Link href="/onboarding" className="btn small" style={{ color: "#fff" }}>
          프로필 완성하기
        </Link>
      </div>
    );
  }

  const recommendations: ScoredPolicy[] = rankPolicies(policies, {
    profile,
    diagnosisInterests,
    bookmarkIds,
  });

  return (
    <>
      {/* 자가진단 미실시 안내 — 진단하면 관심 분야 가점이 반영돼 더 정확해진다 */}
      {!hasDiagnosis && (
        <Link href="/diagnosis">
          <div className="notice blue" style={{ marginBottom: 12 }}>
            🩺 <b>자가진단</b>을 하면 결과가 반영돼 추천이 더 정확해져요 →
          </div>
        </Link>
      )}

      {recommendations.length === 0 ? (
        <div className="empty">
          지금 추천할 정책이 없어요.
          <br />
          프로필 정보를 더 채우거나 잠시 후 다시 확인해주세요.
        </div>
      ) : (
        recommendations.map((rec, idx) => (
          <Link key={rec.policy.id} href={`/policy/${rec.policy.id}`}>
            <div className="card policy-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={styles.rankNum}>{idx + 1}위</span>
                  <span className="cat" style={{ marginBottom: 0 }}>
                    {normalizeCategory(rec.policy.category)}
                  </span>
                  {rec.tier === "partial" && <span className="tag">확인 필요</span>}
                </span>
                <span className={styles.scoreBox}>
                  <span className={styles.scoreLabel}>매칭도</span>
                  <br />
                  <span className={styles.scoreValue}>{rec.score}%</span>
                </span>
              </div>

              <div className="card-body" style={{ marginTop: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="name">{rec.policy.name}</div>
                  <div className="inst">{rec.policy.institution}</div>
                </div>
                {rec.policy.amount !== null && (
                  <div className="card-amount">
                    약 <b>{formatManwon(rec.policy.amount)}</b>
                  </div>
                )}
              </div>

              {/* 추천 사유 */}
              <div className={styles.reasons}>
                {rec.reasons.slice(0, 3).map((reason) => (
                  <span key={reason} className={styles.reason}>
                    ✓ {reason}
                  </span>
                ))}
              </div>

              {/* 매칭도 진행바 */}
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${rec.score}%` }} />
              </div>
            </div>
          </Link>
        ))
      )}

      {/* 추천 알고리즘 안내 (원본 포팅) */}
      <div className={styles.algoCard}>
        <div className={styles.algoTitle}>💡 추천 알고리즘</div>
        <div className={styles.algoItem}>✓ 나이·지역·취업상태 조건 충족 정책 우선</div>
        <div className={styles.algoItem}>✓ 관심 분야(온보딩·자가진단) 일치 시 가점</div>
        <div className={styles.algoItem}>✓ 지원금이 높은 정책 우선</div>
        <div className={styles.algoItem}>✓ 마감일이 가까운 정책 강조</div>
        <div className={styles.algoItem}>✓ 이미 저장한 정책은 순위를 낮춰요</div>
      </div>
    </>
  );
}
