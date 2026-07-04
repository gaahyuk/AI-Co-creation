"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBookmarks, useProfile, profileToQuery, docProgress } from "@/lib/storage";
import type { PolicyWithEligibility } from "@/lib/youth/types";

function ddayLabel(dDay: number | null): { text: string; urgent: boolean } {
  if (dDay === null) return { text: "상시", urgent: false };
  if (dDay < 0) return { text: "마감됨", urgent: false };
  if (dDay === 0) return { text: "오늘 마감!", urgent: true };
  return { text: `D-${dDay}`, urgent: dDay <= 7 };
}

export default function SavedPage() {
  const router = useRouter();
  const { ids } = useBookmarks();
  const { profile, loaded } = useProfile();
  const [policies, setPolicies] = useState<PolicyWithEligibility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    if (ids.length === 0) {
      setPolicies([]);
      setLoading(false);
      return;
    }
    (async () => {
      const q = profileToQuery(profile);
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/policies/${id}${q ? `?${q}` : ""}`);
          return res.ok ? ((await res.json()) as PolicyWithEligibility) : null;
        }),
      );
      // 마감 임박 순 정렬 (상시/마감됨은 뒤로)
      const sorted = results
        .filter((p): p is PolicyWithEligibility => p !== null)
        .sort((a, b) => {
          const ka = a.dDay === null || a.dDay < 0 ? 9999 : a.dDay;
          const kb = b.dDay === null || b.dDay < 0 ? 9999 : b.dDay;
          return ka - kb;
        });
      setPolicies(sorted);
      setLoading(false);
    })();
  }, [loaded, ids, profile]);

  return (
    <>
      <div className="header">
        <div
          onClick={() => router.push("/")}
          style={{ cursor: "pointer", color: "var(--text-sub)", marginBottom: 8 }}
        >
          ‹ 홈
        </div>
        <h1>저장한 정책</h1>
        <div className="sub">마감이 가까운 순으로 보여드려요</div>
      </div>

      <div className="section">
        {loading ? (
          <div className="loading">불러오는 중…</div>
        ) : policies.length === 0 ? (
          <div className="empty">
            저장한 정책이 없어요.
            <br />
            정책 상세에서 ☆ 를 눌러 저장해보세요.
          </div>
        ) : (
          <div className="timeline">
            {policies.map((p) => {
              const d = ddayLabel(p.dDay);
              const prog = docProgress(p.id, p.documents);
              return (
                <Link key={p.id} href={`/policy/${p.id}`}>
                  <div className={`card policy-card timeline-card ${d.urgent ? "urgent" : ""}`}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className={`dday ${d.urgent ? "" : "safe"}`}>{d.text}</span>
                      {p.eligible ? (
                        <span className="badge-ok">신청가능</span>
                      ) : (
                        <span className="badge-warn">조건확인</span>
                      )}
                    </div>
                    <div className="name" style={{ marginTop: 8 }}>
                      {p.name}
                    </div>
                    <div className="inst">{p.institution}</div>
                    {prog.total > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            color: "var(--text-sub)",
                            marginBottom: 4,
                          }}
                        >
                          <span>서류 준비</span>
                          <span>
                            {prog.done}/{prog.total}
                          </span>
                        </div>
                        <div className="progress-track" style={{ margin: 0 }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${(prog.done / prog.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
