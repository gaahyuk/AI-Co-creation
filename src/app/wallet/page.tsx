"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile, profileToQuery, useBookmarks } from "@/lib/storage";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import {
  useWallet,
  useRewards,
  useRewardToast,
  REWARD_RULES,
  STATUS_LABEL,
  type WalletStatus,
} from "@/lib/wallet";
import styles from "./wallet.module.css";

/** 상태별 태그 색상 (globals.css 공용 태그 재사용) */
const STATUS_TAG_CLASS: Record<WalletStatus, string> = {
  interested: "tag",
  applied: "tag blue",
  received: "tag green",
};

const LEVEL_STEP = 1000; // 1000점당 1레벨 (이윤호 로직)

export default function WalletPage() {
  const { profile, loaded: profileLoaded } = useProfile();
  const { ids: bookmarkIds } = useBookmarks();
  const wallet = useWallet();
  const rewards = useRewards();
  const toast = useRewardToast();
  const [bookmarked, setBookmarked] = useState<PolicyWithEligibility[]>([]);

  // 별표(북마크)한 정책 상세 수집 — 지갑에 담기 후보
  useEffect(() => {
    if (!profileLoaded || bookmarkIds.length === 0) {
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
  }, [profileLoaded, profile, bookmarkIds]);

  if (!wallet.loaded || !rewards.loaded) {
    return <div className="loading">지갑을 불러오는 중…</div>;
  }

  // 지갑에 아직 담기지 않은 별표 정책
  const importCandidates = bookmarked.filter((p) => !wallet.has(p.id));
  const levelProgress = rewards.points % LEVEL_STEP;

  const handleRemove = (policyId: string, policyName: string) => {
    if (!window.confirm(`'${policyName}' 정책을 지갑에서 삭제할까요?`)) return;
    wallet.remove(policyId);
  };

  return (
    <>
      <div className="header">
        <h1>정책 지갑</h1>
        <div className="sub">
          관심 정책의 신청 과정을 관리하고 활동 포인트를 모아요
        </div>
      </div>

      {/* 보상 지급 토스트 */}
      {toast && (
        <div className={styles.toast}>
          {toast.icon} {toast.name} +{toast.points}P
        </div>
      )}

      <div className="section">
        {/* 지갑 요약 카드 */}
        <div className="money-card" style={{ marginBottom: 12 }}>
          <div className="money-label">지금까지 받은 지원금</div>
          <div className="money-value">
            {formatManwon(wallet.totalReceived)}
          </div>
          <div className="money-sub">
            수령완료 {wallet.receivedCount}건 기준 · 지갑에 기록한 금액 합계예요
          </div>
        </div>

        <div className="card">
          <div className="stat-row">
            <span className="stat-label">📂 관심 정책</span>
            <span className="stat-value">{wallet.interestedCount}개</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">📝 신청 진행 중</span>
            <span className="stat-value blue">{wallet.appliedCount}개</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">🎉 수혜 완료</span>
            <span className="stat-value" style={{ color: "var(--green)" }}>
              {wallet.receivedCount}개
            </span>
          </div>
        </div>

        {/* 신청 현황 목록 */}
        <div className="section-title">
          신청 현황 <small>{wallet.entries.length}개</small>
        </div>

        {wallet.entries.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
            <p style={{ color: "var(--text-sub)", fontSize: 14, margin: "0 0 16px" }}>
              지갑에 보관된 정책이 없어요.
              <br />
              정책을 담고 신청 과정을 기록해 보세요.
            </p>
            <Link href="/" className="btn small" style={{ display: "inline-block" }}>
              추천 정책 찾으러 가기
            </Link>
          </div>
        ) : (
          wallet.entries.map((entry) => (
            <div className="card" key={entry.policyId}>
              <div className={styles.entryTop}>
                <span className={STATUS_TAG_CLASS[entry.status]}>
                  {STATUS_LABEL[entry.status]}
                </span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleRemove(entry.policyId, entry.policyName)}
                >
                  지우기
                </button>
              </div>

              <Link href={`/policy/${entry.policyId}`}>
                <div className={styles.entryName}>{entry.policyName}</div>
              </Link>
              <div className={styles.entryDate}>
                기록일 {new Date(entry.date).toLocaleDateString("ko-KR")}
              </div>

              <div className={styles.entryControls}>
                <select
                  className={styles.statusSelect}
                  value={entry.status}
                  onChange={(e) =>
                    wallet.setStatus(entry.policyId, e.target.value as WalletStatus)
                  }
                >
                  <option value="interested">📂 관심</option>
                  <option value="applied">📝 신청 진행 중</option>
                  <option value="received">🎉 수혜 완료</option>
                </select>
                <label className={styles.amountBox}>
                  <input
                    className={styles.amountInput}
                    type="number"
                    min={0}
                    placeholder="금액"
                    value={entry.amount ?? ""}
                    onChange={(e) =>
                      wallet.setAmount(
                        entry.policyId,
                        e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      )
                    }
                  />
                  만원
                </label>
              </div>
            </div>
          ))
        )}

        <div className="notice blue" style={{ marginTop: 4 }}>
          정책을 <b>신청 진행 중</b>으로 바꾸면 활동 포인트가 적립돼요. 수혜
          완료 시 실제 받은 금액(만원)을 입력하면 총 수령액에 합산돼요.
        </div>

        {/* 별표한 정책 담기 */}
        {importCandidates.length > 0 && (
          <>
            <div className="section-title">
              별표한 정책 담기 <small>{importCandidates.length}개</small>
            </div>
            <div className="card">
              {importCandidates.map((p) => (
                <div className={styles.importRow} key={p.id}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/policy/${p.id}`}>
                      <div className={styles.importName}>{p.name}</div>
                    </Link>
                    {p.amount !== null && (
                      <div className={styles.importAmount}>
                        예상 지원금 약 {formatManwon(p.amount)}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.importBtn}
                    onClick={() =>
                      wallet.add({
                        policyId: p.id,
                        policyName: p.name,
                        status: "interested",
                        amount: p.amount,
                      })
                    }
                  >
                    담기
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 활동 리워드 */}
        <div className="section-title">활동 리워드</div>
        <div className="card">
          <div className={styles.pointsRow}>
            <span className={styles.pointsValue}>
              {rewards.points.toLocaleString()}P
            </span>
            <span className="tag blue">Lv.{rewards.level}</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(levelProgress / LEVEL_STEP) * 100}%` }}
            />
          </div>
          <div className={styles.levelHint}>
            다음 레벨까지 {(LEVEL_STEP - levelProgress).toLocaleString()}P 남았어요
          </div>

          <div className={styles.badgeGrid}>
            {REWARD_RULES.map((rule) => (
              <div
                key={rule.code}
                className={`${styles.badge} ${
                  rewards.earned(rule.code) ? styles.badgeEarned : ""
                }`}
                title={rule.description}
              >
                <div className={styles.badgeIcon}>{rule.icon}</div>
                <div className={styles.badgeName}>{rule.name}</div>
                <div className={styles.badgePoints}>+{rule.points}P</div>
              </div>
            ))}
          </div>
        </div>

        {/* 적립 내역 */}
        <div className="section-title">
          적립 내역 <small>{rewards.history.length}건</small>
        </div>
        {rewards.history.length === 0 ? (
          <div className="notice">
            아직 적립 내역이 없어요. 정책 신청, 후기 작성, 자가진단 등 활동을
            하면 포인트가 쌓여요.
          </div>
        ) : (
          <div className="card">
            {rewards.history.map((h, i) => (
              <div className={styles.historyRow} key={`${h.date}-${i}`}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.historyReason}>{h.reason}</div>
                  <div className={styles.historyDate}>
                    {new Date(h.date).toLocaleDateString("ko-KR")}
                  </div>
                </div>
                <span className={styles.historyPoints}>+{h.points}P</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
