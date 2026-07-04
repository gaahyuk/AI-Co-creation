"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useProfile,
  profileToQuery,
  useBookmarks,
  useDocChecklist,
  splitDocuments,
} from "@/lib/storage";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import { formatManwon } from "@/lib/format";

function Mark({ passed }: { passed: boolean | null }) {
  if (passed === true) return <span className="check-mark ok">충족 ✓</span>;
  if (passed === false) return <span className="check-mark no">미충족 ✕</span>;
  return <span className="check-mark unknown">확인 필요</span>;
}

function DocChecklist({ plcyNo, documents }: { plcyNo: string; documents: string }) {
  const items = splitDocuments(documents);
  const { toggle, isChecked, checked } = useDocChecklist(plcyNo);
  if (items.length === 0) return null;
  const done = items.filter((_, i) => isChecked(i)).length;
  void checked;
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>제출 서류 준비</h3>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--toss-blue)" }}>
          {done}/{items.length}
        </span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
        />
      </div>
      {items.map((doc, i) => (
        <label key={i} className="doc-row">
          <input type="checkbox" checked={isChecked(i)} onChange={() => toggle(i)} />
          <span className={isChecked(i) ? "doc-done" : ""}>{doc}</span>
        </label>
      ))}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content?.trim()) return null;
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      <p>{content}</p>
    </div>
  );
}

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ plcyNo: string }>;
}) {
  const { plcyNo } = use(params);
  const router = useRouter();
  const { profile, loaded } = useProfile();
  const { has, toggle } = useBookmarks();
  const [policy, setPolicy] = useState<PolicyWithEligibility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const q = profileToQuery(profile);
        const res = await fetch(`/api/policies/${plcyNo}${q ? `?${q}` : ""}`);
        if (res.ok) setPolicy(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [loaded, profile, plcyNo]);

  if (loading) return <div className="loading">불러오는 중…</div>;
  if (!policy) return <div className="empty">정책 정보를 찾을 수 없어요.</div>;

  const applyTarget = policy.applyUrl || policy.refUrls[0] || "";
  // URL이 도메인 메인(경로 없음)이면 특정 신청 페이지가 아닌 기관 홈페이지로 간주
  const isHomepageLevel = (() => {
    try {
      const u = new URL(applyTarget);
      return u.pathname === "/" || u.pathname === "";
    } catch {
      return false;
    }
  })();

  const openApply = () => {
    if (applyTarget) window.open(applyTarget, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className="header">
        <div
          onClick={() => router.back()}
          style={{ cursor: "pointer", color: "var(--text-sub)", marginBottom: 8 }}
        >
          ‹ 뒤로
        </div>
        <span className="cat">{policy.category || "기타"}</span>
        <h1 style={{ fontSize: 20, marginTop: 8 }}>{policy.name}</h1>
        <div className="sub">{policy.institution}</div>
      </div>

      <div className="section">
        {/* 자격 체크리스트 */}
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 15 }}>내 자격 확인</h3>
          {policy.checks.map((c) => (
            <div className="check-row" key={c.label}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.label}</div>
                <div className="inst">{c.detail}</div>
              </div>
              <Mark passed={c.passed} />
            </div>
          ))}
        </div>

        {policy.amount !== null && (
          <div className="detail-money">
            <span className="detail-money-label">💰 예상 지원금</span>
            <span className="detail-money-value">약 {formatManwon(policy.amount)}</span>
            <span className="detail-money-sub">지원 내용 기준 추정치</span>
          </div>
        )}

        <Section title="정책 설명" content={policy.description} />
        <Section title="지원 내용" content={policy.supportContent} />
        <Section title="신청 방법" content={policy.applyMethod} />
        <DocChecklist plcyNo={policy.id} documents={policy.documents} />
        <Section title="추가 자격조건" content={policy.additionalQualification} />
        {(policy.periodStart || policy.periodEnd) && (
          <Section
            title="신청 기간"
            content={`${policy.periodStart ?? "상시"} ~ ${policy.periodEnd ?? "상시"}`}
          />
        )}

        {policy.refUrls.length > 0 && (
          <div className="detail-section">
            <h3>참고 링크</h3>
            {policy.refUrls.map((u) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="ref-link"
              >
                🔗 {u.length > 50 ? u.slice(0, 50) + "…" : u}
              </a>
            ))}
          </div>
        )}
      </div>

      {applyTarget && isHomepageLevel && (
        <div className="section">
          <div className="apply-hint">
            ℹ️ 신청 버튼은 기관 홈페이지로 연결돼요. 위 <b>신청 방법</b>을 참고해 해당
            메뉴에서 신청해주세요.
          </div>
        </div>
      )}

      <div className="bottombar">
        <button
          className="btn secondary"
          style={{ flex: "0 0 56px" }}
          onClick={() => toggle(policy.id)}
        >
          {has(policy.id) ? "★" : "☆"}
        </button>
        <button className="btn" onClick={openApply} disabled={!applyTarget}>
          {!applyTarget
            ? "신청 링크 없음"
            : isHomepageLevel
              ? "신청 사이트로 가기"
              : "신청하러 가기"}
        </button>
      </div>
    </>
  );
}
