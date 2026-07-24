"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBookmarks, useProfile, profileToQuery, splitDocuments } from "@/lib/storage";
import { useCompare, MAX_COMPARE } from "@/lib/compare";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import styles from "./compare.module.css";

/** 마감 D-Day 표시 텍스트 */
function ddayText(dDay: number | null): string {
  if (dDay === null) return "상시";
  if (dDay < 0) return "마감됨";
  if (dDay === 0) return "오늘 마감!";
  return `D-${dDay}`;
}

/** 자격 판정 배지 (홈/저장함과 동일한 3단계) */
function EligBadge({ p }: { p: PolicyWithEligibility }) {
  if (p.fullMatch) return <span className="badge-full">✓ 자격충족</span>;
  if (p.eligible) return <span className="badge-ok">신청가능</span>;
  return <span className="badge-warn">조건확인</span>;
}

/** 연령 조건 텍스트 */
function ageText(p: PolicyWithEligibility): string {
  if (p.minAge === null && p.maxAge === null) {
    return p.ageLimited ? "확인 필요" : "제한없음";
  }
  if (!p.ageLimited) return "제한없음";
  if (p.minAge !== null && p.maxAge !== null) return `만 ${p.minAge}~${p.maxAge}세`;
  if (p.minAge !== null) return `만 ${p.minAge}세 이상`;
  return `만 ${p.maxAge}세 이하`;
}

/** 소득 조건 텍스트 */
function incomeText(p: PolicyWithEligibility): string {
  if (p.earnMin === null && p.earnMax === null) return "제한없음";
  if (p.earnMin !== null && p.earnMax !== null)
    return `${p.earnMin.toLocaleString()}~${p.earnMax.toLocaleString()}만원`;
  if (p.earnMax !== null) return `${p.earnMax.toLocaleString()}만원 이하`;
  return `${p.earnMin!.toLocaleString()}만원 이상`;
}

/** 신청 기간 텍스트 */
function periodText(p: PolicyWithEligibility): string {
  if (!p.periodStart && !p.periodEnd) return "상시";
  return `${p.periodStart ?? "상시"} ~ ${p.periodEnd ?? "상시"}`;
}

export default function ComparePage() {
  const router = useRouter();
  const { ids: bookmarkIds } = useBookmarks();
  const { profile, loaded } = useProfile();
  const compare = useCompare();
  const [policies, setPolicies] = useState<PolicyWithEligibility[]>([]);
  const [loading, setLoading] = useState(true);

  // 북마크한 정책 전체 상세 조회 (자격 판정 포함)
  useEffect(() => {
    if (!loaded) return;
    if (bookmarkIds.length === 0) {
      setPolicies([]);
      setLoading(false);
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
      setPolicies(results.filter((p): p is PolicyWithEligibility => p !== null));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, profile, bookmarkIds]);

  // 북마크에서 해제된 정책은 비교함에서도 정리
  useEffect(() => {
    if (loaded && compare.loaded) compare.prune(bookmarkIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, compare.loaded, bookmarkIds, compare.ids]);

  // 선택된 정책 (선택 순서 유지)
  const selected = useMemo(
    () =>
      compare.ids
        .map((id) => policies.find((p) => p.id === id))
        .filter((p): p is PolicyWithEligibility => p !== undefined),
    [compare.ids, policies],
  );

  // 지원금액 최고 정책 강조용
  const bestAmount = useMemo(() => {
    const amounts = selected.map((p) => p.amount).filter((a): a is number => a !== null);
    return amounts.length > 0 ? Math.max(...amounts) : null;
  }, [selected]);

  if (!loaded || loading || !compare.loaded) {
    return <div className="loading">불러오는 중…</div>;
  }

  // 비교 테이블 행 구성 — 원본 policy-comparison.tsx의 항목을 베이스 필드에 매핑
  const rows: { label: string; render: (p: PolicyWithEligibility) => ReactNode }[] = [
    {
      label: "자격 여부",
      render: (p) => <EligBadge p={p} />,
    },
    {
      label: "지원금액",
      render: (p) =>
        p.amount !== null ? (
          <span className={styles.amount}>
            약 {formatManwon(p.amount)}
            {bestAmount !== null && p.amount === bestAmount && selected.length > 1 && (
              <span className={styles.bestAmount}>최고</span>
            )}
          </span>
        ) : (
          <span className={styles.muted}>미정</span>
        ),
    },
    {
      label: "주관기관",
      render: (p) => p.institution || <span className={styles.muted}>-</span>,
    },
    {
      label: "연령 조건",
      render: (p) => ageText(p),
    },
    {
      label: "소득 조건",
      render: (p) => incomeText(p),
    },
    {
      label: "마감",
      render: (p) => (
        <span
          className={`dday ${p.dDay !== null && p.dDay >= 0 && p.dDay <= 14 ? "" : "safe"}`}
        >
          {ddayText(p.dDay)}
        </span>
      ),
    },
    {
      label: "신청기간",
      render: (p) => periodText(p),
    },
    {
      label: "신청방법",
      render: (p) =>
        p.applyMethod?.trim() ? (
          <span className={styles.clamp}>{p.applyMethod}</span>
        ) : (
          <span className={styles.muted}>-</span>
        ),
    },
    {
      label: "필요서류",
      render: (p) => {
        const n = splitDocuments(p.documents).length;
        return n > 0 ? `${n}개` : <span className={styles.muted}>확인 필요</span>;
      },
    },
    {
      label: "바로신청",
      render: (p) =>
        p.directApply ? "⚡ 온라인 바로신청" : <span className={styles.muted}>기관 확인</span>,
    },
  ];

  return (
    <>
      <div className="header">
        <div
          onClick={() => router.back()}
          style={{ cursor: "pointer", color: "var(--text-sub)", marginBottom: 8 }}
        >
          ‹ 뒤로
        </div>
        <h1>⚖️ 정책 비교</h1>
        <div className="sub">저장한 정책 중 2~{MAX_COMPARE}개를 골라 나란히 비교해요</div>
      </div>

      <div className="section">
        {policies.length === 0 ? (
          <div className="empty">
            저장한 정책이 없어요.
            <br />
            정책 상세에서 ☆ 를 눌러 저장하면 여기서 비교할 수 있어요.
            <div style={{ marginTop: 16 }}>
              <Link href="/">
                <button className="btn small">정책 보러 가기</button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 선택 리스트 */}
            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15 }}>비교할 정책 선택</h3>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--toss-blue)" }}>
                  {selected.length}/{MAX_COMPARE}
                </span>
              </div>
              {policies.map((p) => {
                const checked = compare.has(p.id);
                const disabled = !checked && !compare.canAdd;
                return (
                  <label key={p.id} className={styles.pickRow}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => compare.toggle(p.id)}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span className={styles.pickName}>{p.name}</span>
                      <span className={styles.pickMeta}>
                        <span>{p.category || "기타"}</span>
                        {p.amount !== null && (
                          <span className={styles.pickAmount}>약 {formatManwon(p.amount)}</span>
                        )}
                        <span>{ddayText(p.dDay)}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
              {selected.length > 0 && (
                <button
                  className="btn secondary small"
                  style={{ marginTop: 12 }}
                  onClick={() => compare.clear()}
                >
                  선택 초기화
                </button>
              )}
            </div>

            {/* 비교 결과 */}
            {selected.length < 2 ? (
              <div className="notice blue">
                비교할 정책을 2개 이상 선택하면 항목별로 나란히 보여드려요.
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.rowLabel}>항목</th>
                        {selected.map((p) => (
                          <th key={p.id} className={styles.colHead}>
                            <span className={styles.colHeadCat}>{p.category || "기타"}</span>
                            <br />
                            {p.name}
                            <br />
                            <Link href={`/policy/${p.id}`} className={styles.colHeadLink}>
                              상세 보기 ›
                            </Link>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.label}>
                          <th className={styles.rowLabel}>{row.label}</th>
                          {selected.map((p) => (
                            <td key={p.id}>{row.render(p)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="notice">
                  지원금액은 지원 내용 기준 추정치이며, 실제 금액·조건은 각 정책 상세와 주관기관
                  공고를 확인해주세요.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
