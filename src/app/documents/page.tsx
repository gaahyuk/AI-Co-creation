"use client";

// 서류함 — 서류 등록(메타데이터), 자동 분류, 발급 가이드, 정책 체크리스트 연계
// (참조: 이윤호 브랜치 /documents 기능을 localStorage 기반으로 포팅)

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useProfile,
  profileToQuery,
  useBookmarks,
  useDocChecklist,
  splitDocuments,
} from "@/lib/storage";
import {
  useDocLocker,
  docTypeName,
  matchRequirementToDocType,
  formatFileSize,
  DOC_TYPE_OPTIONS,
  type StoredDocMeta,
} from "@/lib/documents";
import { grantReward } from "@/lib/wallet";
import {
  DOCUMENT_GUIDES,
  guideByCode,
  formatFee,
  formatProcessingDay,
} from "@/lib/document-guides-data";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import styles from "./documents.module.css";

/** 등록된 서류 한 건 카드 */
function DocCard({
  doc,
  onRemove,
  onSetType,
}: {
  doc: StoredDocMeta;
  onRemove: () => void;
  onSetType: (docType: string | null) => void;
}) {
  const guide = guideByCode(doc.docType);
  return (
    <div className="card">
      <div className={styles.docHead}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.docName}>📄 {doc.fileName}</div>
          <div className={styles.docMeta}>
            {doc.uploadedAt.slice(0, 10)} · {formatFileSize(doc.size)} ·{" "}
            {doc.docType ? "분석 완료" : "자동 분류 실패"}
          </div>
        </div>
        <button className={styles.deleteBtn} onClick={onRemove}>
          삭제
        </button>
      </div>

      <div className={styles.typeRow}>
        <span style={{ color: "var(--text-sub)", flex: "0 0 auto" }}>분류:</span>
        {doc.docType ? (
          <span className="tag blue">{docTypeName(doc.docType)}</span>
        ) : (
          <span className="tag red">미분류</span>
        )}
      </div>

      {/* 분류가 잘못됐다면 직접 수정 */}
      <div className={styles.typeRow}>
        <select
          className={styles.typeSelect}
          value={doc.docType ?? ""}
          onChange={(e) => onSetType(e.target.value || null)}
        >
          <option value="">문서 종류 직접 선택</option>
          {DOC_TYPE_OPTIONS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {guide && (
        <div className={styles.docMeta} style={{ marginTop: 8 }}>
          💡 재발급: {guide.issuePlaces[0]?.name} · {formatFee(guide.fee)} ·{" "}
          {formatProcessingDay(guide.processingDay)}
        </div>
      )}
    </div>
  );
}

/** 서류 발급 가이드 아코디언 항목 */
function GuideCard({ code, owned }: { code: string; owned: boolean }) {
  const [open, setOpen] = useState(false);
  const guide = guideByCode(code);
  if (!guide) return null;
  return (
    <div className="card">
      <div className={styles.guideHead} onClick={() => setOpen((v) => !v)}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.guideTitle}>
            {guide.title}{" "}
            {owned && <span className="tag green">보유</span>}
          </div>
          <div className={styles.guideDesc}>{guide.description}</div>
        </div>
        <span className={styles.guideArrow}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className={styles.guideBody}>
          <div className={styles.guideLabel}>발급 방법</div>
          <ol className={styles.stepList}>
            {guide.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>

          <div className={styles.guideLabel}>발급처</div>
          {guide.issuePlaces.map((p) => (
            <div key={p.name} className={styles.placeRow}>
              <div className={styles.placeName}>{p.name}</div>
              <div className={styles.placeInfo}>
                {p.address} · ☎ {p.phone}
              </div>
            </div>
          ))}

          <div className={styles.feeRow}>
            <span className="tag">수수료 {formatFee(guide.fee)}</span>
            <span className="tag">{formatProcessingDay(guide.processingDay)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** 저장한 정책 하나의 제출서류 현황 (체크리스트 youth.docs.<id> 와 동기화) */
function PolicyDocCard({
  policy,
  ownedTypes,
}: {
  policy: PolicyWithEligibility;
  ownedTypes: Set<string>;
}) {
  const items = splitDocuments(policy.documents);
  const { toggle, isChecked } = useDocChecklist(policy.id);
  const done = items.filter((_, i) => isChecked(i)).length;

  // 제출서류 체크리스트를 100% 완료하면 배지 지급
  useEffect(() => {
    if (items.length > 0 && done === items.length) {
      grantReward("documents_prepared");
    }
  }, [done, items.length]);

  if (items.length === 0) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={`/policy/${policy.id}`} style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{policy.name}</div>
        </Link>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--toss-blue)", flex: "0 0 auto" }}>
          {done}/{items.length}
        </span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
        />
      </div>
      {items.map((req, i) => {
        const matched = matchRequirementToDocType(req);
        const owned = matched !== null && ownedTypes.has(matched);
        return (
          <div key={i} className={styles.reqRow}>
            <input
              type="checkbox"
              checked={isChecked(i)}
              onChange={() => toggle(i)}
              style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--toss-blue)", flex: "0 0 auto" }}
            />
            <span className={`${styles.reqText} ${isChecked(i) ? "doc-done" : ""}`}>{req}</span>
            <span className={styles.reqBadges}>
              {owned && <span className="tag green">보유</span>}
              {!owned && matched !== null && <span className="tag">필요</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const { docs, loaded, add, remove, setType, ownedTypes } = useDocLocker();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  // 저장(북마크)한 정책의 제출서류와 연계
  const { profile, loaded: profileLoaded } = useProfile();
  const { ids: bookmarkIds } = useBookmarks();
  const [bookmarked, setBookmarked] = useState<PolicyWithEligibility[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  useEffect(() => {
    if (!profileLoaded || bookmarkIds.length === 0) {
      setBookmarked([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setPoliciesLoading(true);
      try {
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
      } finally {
        if (!cancelled) setPoliciesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileLoaded, profile, bookmarkIds]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setLastResult({ ok: false, message: "10MB 이하 파일만 등록할 수 있어요." });
      e.target.value = "";
      return;
    }
    const meta = add(file);
    setLastResult(
      meta.docType
        ? { ok: true, message: `"${meta.fileName}" 등록 완료 — ${docTypeName(meta.docType)}(으)로 자동 분류했어요.` }
        : { ok: false, message: `"${meta.fileName}" 등록 완료 — 자동 분류에 실패했어요. 아래에서 문서 종류를 직접 선택해주세요.` },
    );
    e.target.value = "";
  };

  // 제출서류가 있는 저장 정책만
  const policiesWithDocs = bookmarked.filter((p) => splitDocuments(p.documents).length > 0);

  return (
    <>
      <div className="header">
        <div
          onClick={() => router.back()}
          style={{ cursor: "pointer", color: "var(--text-sub)", marginBottom: 8 }}
        >
          ‹ 뒤로
        </div>
        <h1>서류함</h1>
        <div className="sub">
          한 번 등록한 서류는 여러 정책 신청 준비에 재사용돼요
        </div>
      </div>

      <div className="section">
        {/* 실제 파일 저장 불가 안내 */}
        <div className="notice" style={{ marginBottom: 12 }}>
          ⚠️ 이 앱은 서버 없이 동작해서 <b>실제 파일은 저장되지 않아요.</b> 파일명
          기준으로 서류 종류를 자동 분류하고, 파일명·크기 등 메타데이터만 브라우저에
          보관해요.
        </div>

        {/* 서류 등록 */}
        <label className={styles.uploadBox}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className={styles.hiddenInput}
            onChange={onFileChange}
          />
          <div className={styles.uploadIcon}>📤</div>
          <div className={styles.uploadTitle}>서류 등록하기</div>
          <div className={styles.uploadSub}>
            PDF, PNG, JPG / 최대 10MB
            <br />
            등록하면 자동으로 문서 종류를 분류하고, 잘못됐다면 직접 수정할 수 있어요
          </div>
        </label>

        {lastResult && (
          <div
            className={`${styles.uploadResult} ${lastResult.ok ? styles.uploadResultOk : styles.uploadResultWarn}`}
          >
            {lastResult.ok ? "✅ " : "⚠️ "}
            {lastResult.message}
          </div>
        )}

        {/* 내 서류 목록 */}
        <div className="section-title">
          내 서류 {docs.length > 0 && <small>{docs.length}건</small>}
        </div>
        {!loaded ? (
          <div className="loading">불러오는 중…</div>
        ) : docs.length === 0 ? (
          <div className="empty" style={{ padding: "30px 20px" }}>
            등록된 서류가 없어요.
            <br />
            위에서 서류를 등록해보세요.
          </div>
        ) : (
          docs.map((d) => (
            <DocCard
              key={d.id}
              doc={d}
              onRemove={() => remove(d.id)}
              onSetType={(t) => setType(d.id, t)}
            />
          ))
        )}

        {/* 저장한 정책의 제출서류 현황 */}
        <div className="section-title">저장한 정책 서류 현황</div>
        {policiesLoading ? (
          <div className="loading">정책을 확인하고 있어요…</div>
        ) : policiesWithDocs.length === 0 ? (
          <div className="notice">
            제출서류가 있는 저장 정책이 없어요. 정책 상세에서 ☆ 를 눌러 저장하면 필요한
            서류를 여기서 한눈에 챙길 수 있어요.
          </div>
        ) : (
          <>
            <div className="notice blue" style={{ marginBottom: 12 }}>
              서류함에 있는 서류와 자동으로 대조해 <b>보유</b> 여부를 표시해요. 체크
              상태는 정책 상세의 체크리스트와 함께 저장돼요.
            </div>
            {policiesWithDocs.map((p) => (
              <PolicyDocCard key={p.id} policy={p} ownedTypes={ownedTypes} />
            ))}
          </>
        )}

        {/* 서류 발급 가이드 */}
        <div className="section-title">서류 발급 가이드</div>
        {DOCUMENT_GUIDES.map((g) => (
          <GuideCard key={g.code} code={g.code} owned={ownedTypes.has(g.code)} />
        ))}
      </div>
    </>
  );
}
