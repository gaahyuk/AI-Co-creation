"use client";

// 자가진단 — 단계별 질문(생년월일/지역/취업상태/소득/관심분야)에 답하면
// 맞춤 정책 유형을 진단하고 결과를 youth.diagnosis 에 저장한다.
// 결과 화면에서는 진단 조건으로 /api/policies 를 조회해 추천 정책을 적합도순으로 보여준다.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  EMPLOYMENT_OPTIONS,
  INCOME_LEVELS,
  buildDiagnosis,
  diagnosePolicy,
  diagnosisToProfile,
  loadDiagnosis,
  saveDiagnosis,
  type DiagnosisAnswers,
  type DiagnosisResult,
} from "@/lib/diagnosis";
import { loadProfile, saveProfile } from "@/lib/storage";
import { SIDO_LIST, CATEGORIES } from "@/lib/regions";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";

const STEP_TITLES = [
  "언제 태어나셨어요?",
  "어디에 살고 계세요?",
  "지금 어떤 상태인가요?",
  "소득 구간을 알려주세요",
  "어떤 정책이 궁금하세요?",
];

/** 적합도 점수 배지 (참조 대시보드의 high/mid/low 구분을 베이스 배지 클래스로) */
function ScoreBadge({ score }: { score: number }) {
  if (score >= 90) return <span className="badge-full">적합도 {score}%</span>;
  if (score >= 60) return <span className="badge-ok">적합도 {score}%</span>;
  return <span className="badge-warn">적합도 {score}%</span>;
}

/** 추천 정책 카드에 붙일 적합도 계산 결과 */
type ScoredPolicy = PolicyWithEligibility & { diagScore: number };

export default function DiagnosisPage() {
  const [step, setStep] = useState(0); // 0~4 질문, 5 결과
  const [birthDate, setBirthDate] = useState("");
  const [sidoCode, setSidoCode] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [employmentId, setEmploymentId] = useState("");
  const [incomeLevelId, setIncomeLevelId] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [recommended, setRecommended] = useState<ScoredPolicy[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [recoLoading, setRecoLoading] = useState(false);
  const [profileApplied, setProfileApplied] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 저장된 진단 결과가 있으면 결과 화면으로 바로 진입 + 응답값 프리필
  useEffect(() => {
    const saved = loadDiagnosis();
    if (saved) {
      const a = saved.answers;
      setBirthDate(a.birthDate);
      setSidoCode(a.sidoCode);
      setRegionCode(a.regionCode);
      setEmploymentId(a.employmentId);
      setIncomeLevelId(a.incomeLevelId);
      setInterests(a.interests);
      setResult(saved);
      setStep(5);
    }
    setInitialized(true);
  }, []);

  const sigunguList = useMemo(
    () => SIDO_LIST.find((s) => s.code === sidoCode)?.sigungu ?? [],
    [sidoCode],
  );

  // 결과 화면 진입 시 진단 조건으로 추천 정책 조회 → 적합도순 정렬
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    (async () => {
      setRecoLoading(true);
      try {
        const q = new URLSearchParams();
        if (result.age !== null) q.set("age", String(result.age));
        if (result.answers.regionCode) q.set("regionCode", result.answers.regionCode);
        else if (result.answers.sidoCode) q.set("sido", result.answers.sidoCode);
        if (result.jobCode) q.set("jobCode", result.jobCode);
        if (result.incomeManwon !== null) q.set("income", String(result.incomeManwon));
        q.set("eligibleOnly", "true");
        q.set("interests", result.recommendedCategories.join(","));
        q.set("size", "24");
        q.set("page", "1");
        const res = await fetch(`/api/policies?${q.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        const items: PolicyWithEligibility[] = data.items ?? [];
        const scored = items
          .map((p) => ({ ...p, diagScore: diagnosePolicy(result, p).score }))
          .sort((a, b) => b.diagScore - a.diagScore)
          .slice(0, 8);
        setRecommended(scored);
        setTotalCount(data.totalCount ?? 0);
      } catch {
        if (!cancelled) {
          setRecommended([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setRecoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result]);

  /** 마지막 질문 완료: 진단 실행 + 저장 + 결과 화면으로 */
  const runDiagnosis = () => {
    const answers: DiagnosisAnswers = {
      birthDate,
      sidoCode,
      regionCode,
      employmentId,
      incomeLevelId,
      interests,
    };
    const diag = buildDiagnosis(answers);
    saveDiagnosis(diag);
    setResult(diag);
    setProfileApplied(false);
    setStep(5);
  };

  /** 진단 결과를 youth.profile 에 병합 반영 */
  const applyToProfile = () => {
    if (!result) return;
    const existing = loadProfile();
    saveProfile({ ...existing, ...diagnosisToProfile(result) });
    setProfileApplied(true);
  };

  /** 처음부터 다시 진단 (기존 응답은 프리필 유지) */
  const restart = () => {
    setResult(null);
    setRecommended([]);
    setProfileApplied(false);
    setStep(0);
  };

  if (!initialized) return <div className="loading">불러오는 중…</div>;

  const isResult = step === 5 && result !== null;

  return (
    <>
      <div className="header">
        {step > 0 && step < 5 && (
          <div
            onClick={() => setStep(step - 1)}
            style={{ cursor: "pointer", color: "var(--text-sub)", marginBottom: 8 }}
          >
            ‹ 이전
          </div>
        )}
        {!isResult && (
          <div className="step-dots">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`step-dot ${i <= step ? "on" : ""}`} />
            ))}
          </div>
        )}
        <h1>{isResult ? "자가진단 결과" : STEP_TITLES[step]}</h1>
        <div className="sub">
          {isResult
            ? "내 상황에 맞는 정책 유형과 추천 정책이에요"
            : "몇 가지 질문으로 맞춤 정책 유형을 진단해드려요"}
        </div>
      </div>

      <div className="section">
        {/* 0. 생년월일 */}
        {step === 0 && (
          <>
            <div className="field">
              <label>생년월일</label>
              <input
                type="date"
                value={birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setBirthDate(e.target.value)}
              />
              <div className="hint">만 나이 기준으로 연령 조건을 판정해요</div>
            </div>
            <button className="btn" onClick={() => setStep(1)} disabled={!birthDate}>
              다음
            </button>
          </>
        )}

        {/* 1. 지역 */}
        {step === 1 && (
          <>
            <div className="field">
              <label>거주지 (시/도)</label>
              <select
                value={sidoCode}
                onChange={(e) => {
                  setSidoCode(e.target.value);
                  setRegionCode("");
                }}
              >
                <option value="">선택 안 함 (전국)</option>
                {SIDO_LIST.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {sidoCode && (
              <div className="field">
                <label>거주지 (시/군/구)</label>
                <select value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
                  <option value="">전체</option>
                  {sigunguList.map((g) => (
                    <option key={g.code} value={g.code}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn" onClick={() => setStep(2)}>
              다음
            </button>
          </>
        )}

        {/* 2. 취업 상태 */}
        {step === 2 && (
          <>
            <div className="field">
              <label>현재 상태에 가장 가까운 것을 골라주세요</label>
              {EMPLOYMENT_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className="card"
                  onClick={() => setEmploymentId(opt.id)}
                  style={{
                    cursor: "pointer",
                    padding: "14px 16px",
                    borderColor:
                      employmentId === opt.id ? "var(--toss-blue)" : "var(--border)",
                    background: employmentId === opt.id ? "#eef4ff" : "var(--card)",
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2 }}>
                    {opt.desc}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn" onClick={() => setStep(3)} disabled={!employmentId}>
              다음
            </button>
          </>
        )}

        {/* 3. 소득 구간 */}
        {step === 3 && (
          <>
            <div className="field">
              <label>가구 소득 구간 (기준 중위소득 대비)</label>
              <div className="chips">
                {INCOME_LEVELS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`chip ${incomeLevelId === l.id ? "on" : ""}`}
                    onClick={() => setIncomeLevelId(l.id)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="hint">
                잘 모르면 &quot;150% 초과 / 잘 모름&quot;을 선택해도 진단할 수 있어요
              </div>
            </div>
            <button className="btn" onClick={() => setStep(4)} disabled={!incomeLevelId}>
              다음
            </button>
          </>
        )}

        {/* 4. 관심 분야 */}
        {step === 4 && (
          <>
            <div className="field">
              <label>관심 분야 (복수 선택, 선택 안 하면 유형 기반 추천)</label>
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${interests.includes(c) ? "on" : ""}`}
                    onClick={() =>
                      setInterests((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                      )
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn" onClick={runDiagnosis}>
              진단 결과 보기
            </button>
          </>
        )}

        {/* 5. 결과 */}
        {isResult && result && (
          <>
            <div className="diag-card">
              <div className="diag-emoji">{result.type.emoji}</div>
              <div className="diag-title">
                나는 <b>{result.type.title}</b>
              </div>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--text-sub)",
                  margin: "12px 0 0",
                }}
              >
                {result.type.description}
              </p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                {result.recommendedCategories.map((c) => (
                  <span key={c} className="tag blue">
                    #{c}
                  </span>
                ))}
              </div>
              {totalCount > 0 && (
                <div className="diag-money">
                  지금 신청 가능한 정책 <b>{totalCount.toLocaleString()}개</b>
                  <div className="diag-money-sub">
                    {result.age !== null ? `만 ${result.age}세 · ` : ""}
                    {result.answers.employmentId} 기준
                  </div>
                </div>
              )}
            </div>

            {result.tips.length > 0 && (
              <div className="card" style={{ marginTop: 12 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>💡 맞춤 안내</h3>
                {result.tips.map((t) => (
                  <div
                    key={t}
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#333d4b",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}

            <button
              className={`btn ${profileApplied ? "secondary" : ""}`}
              style={{ marginTop: 16 }}
              onClick={applyToProfile}
              disabled={profileApplied}
            >
              {profileApplied ? "✓ 프로필에 반영했어요" : "진단 결과로 프로필 업데이트"}
            </button>
            {profileApplied && (
              <div className="notice blue" style={{ marginTop: 8 }}>
                홈 화면의 맞춤 정책이 진단 결과 기준으로 다시 계산돼요.
              </div>
            )}
            <button className="btn secondary" style={{ marginTop: 8 }} onClick={restart}>
              다시 진단하기
            </button>

            <div className="section-title" style={{ marginTop: 24 }}>
              추천 정책
              <small>적합도 높은 순</small>
            </div>
            {recoLoading ? (
              <div className="loading">추천 정책을 찾고 있어요…</div>
            ) : recommended.length === 0 ? (
              <div className="empty">
                조건에 맞는 정책을 찾지 못했어요.
                <br />
                지역이나 소득 구간을 바꿔 다시 진단해보세요.
              </div>
            ) : (
              recommended.map((p) => (
                <Link key={p.id} href={`/policy/${p.id}`}>
                  <div className="card policy-card">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="cat">{p.category || "기타"}</span>
                      <ScoreBadge score={p.diagScore} />
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
                      {p.dDay !== null && p.dDay >= 0 && (
                        <span className={`dday ${p.dDay > 14 ? "safe" : ""}`}>
                          D-{p.dDay}
                        </span>
                      )}
                      {p.keywords.slice(0, 2).map((k) => (
                        <span key={k} className="inst">
                          #{k}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </>
        )}
      </div>
    </>
  );
}
