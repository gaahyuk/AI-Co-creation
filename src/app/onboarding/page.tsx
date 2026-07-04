"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadProfile, saveProfile, profileToQuery } from "@/lib/storage";
import { SIDO_LIST, JOB_STATUSES, CATEGORIES } from "@/lib/regions";
import type { UserProfile } from "@/lib/youth/types";
import { formatManwon } from "@/lib/format";

type Diagnosis = { count: number; total: number; counted: number } | null;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0:나이 1:지역 2:취업/소득 3:관심분야 4:진단
  const [age, setAge] = useState("");
  const [sidoCode, setSidoCode] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [jobCode, setJobCode] = useState("");
  const [income, setIncome] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      if (p.age !== undefined) setAge(String(p.age));
      if (p.regionCode) {
        setSidoCode(p.regionCode.slice(0, 2));
        setRegionCode(p.regionCode);
      } else if (p.sidoCode) {
        setSidoCode(p.sidoCode);
      }
      if (p.jobCode) setJobCode(p.jobCode);
      if (p.income !== undefined) setIncome(String(p.income));
      if (p.interests) setInterests(p.interests);
    }
  }, []);

  const sigunguList = useMemo(
    () => SIDO_LIST.find((s) => s.code === sidoCode)?.sigungu ?? [],
    [sidoCode],
  );

  const buildProfile = (): UserProfile => ({
    age: age ? Number(age) : undefined,
    regionCode: regionCode || undefined,
    sidoCode: !regionCode && sidoCode ? sidoCode : undefined,
    jobCode: jobCode || undefined,
    income: income ? Number(income) : undefined,
    interests: interests.length > 0 ? interests : undefined,
  });

  /** 마지막 스텝: 저장 후 진단 결과 조회 */
  const runDiagnosis = async () => {
    const profile = buildProfile();
    saveProfile(profile);
    setStep(4);
    setDiagLoading(true);
    try {
      const q = new URLSearchParams(profileToQuery(profile));
      q.set("eligibleOnly", "true");
      q.set("size", "1");
      if (profile.interests?.length) q.set("interests", profile.interests.join(","));
      const res = await fetch(`/api/policies?${q.toString()}`);
      const data = await res.json();
      setDiagnosis({
        count: data.totalCount ?? 0,
        total: data.estimatedTotal ?? 0,
        counted: data.estimatedCount ?? 0,
      });
    } catch {
      setDiagnosis(null);
    } finally {
      setDiagLoading(false);
    }
  };

  const stepTitles = [
    "나이를 알려주세요",
    "어디에 살고 계세요?",
    "지금 어떤 상태인가요?",
    "어떤 정책이 궁금하세요?",
    "진단 결과",
  ];

  return (
    <>
      <div className="header">
        {step > 0 && step < 4 && (
          <div
            onClick={() => setStep(step - 1)}
            style={{ cursor: "pointer", color: "var(--text-sub)", marginBottom: 8 }}
          >
            ‹ 이전
          </div>
        )}
        <div className="step-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`step-dot ${i <= Math.min(step, 3) ? "on" : ""}`} />
          ))}
        </div>
        <h1>{stepTitles[step]}</h1>
        {step < 4 && <div className="sub">맞춤 정책을 찾는 데 사용돼요</div>}
      </div>

      <div className="section">
        {step === 0 && (
          <>
            <div className="field">
              <label>나이 (만)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="예: 25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                autoFocus
              />
            </div>
            <button className="btn" onClick={() => setStep(1)} disabled={!age}>
              다음
            </button>
          </>
        )}

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

        {step === 2 && (
          <>
            <div className="field">
              <label>취업 상태</label>
              <select value={jobCode} onChange={(e) => setJobCode(e.target.value)}>
                <option value="">선택 안 함</option>
                {JOB_STATUSES.map((j) => (
                  <option key={j.code} value={j.code}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>월 소득 (만원, 선택)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="예: 200"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
            </div>
            <button className="btn" onClick={() => setStep(3)}>
              다음
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="field">
              <label>관심 분야 (복수 선택, 선택 안 하면 전체)</label>
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
              내 정책 진단받기
            </button>
          </>
        )}

        {step === 4 && (
          <>
            {diagLoading ? (
              <div className="loading">신청 가능한 정책을 찾고 있어요…</div>
            ) : diagnosis ? (
              <div className="diag-card">
                <div className="diag-emoji">🎉</div>
                <div className="diag-title">
                  지금 신청할 수 있는 정책이
                  <br />
                  <b>{diagnosis.count.toLocaleString()}개</b> 있어요
                </div>
                {diagnosis.total > 0 && (
                  <div className="diag-money">
                    받을 수 있는 돈 <b>약 {formatManwon(diagnosis.total)}</b>
                    <div className="diag-money-sub">
                      금액 확인된 {diagnosis.counted}개 정책 기준 추정치
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty">진단에 실패했어요. 다시 시도해주세요.</div>
            )}
            <button className="btn" style={{ marginTop: 16 }} onClick={() => router.push("/")}>
              맞춤 정책 보러가기
            </button>
            {!diagLoading && (
              <button
                className="btn secondary"
                style={{ marginTop: 8 }}
                onClick={() => setStep(0)}
              >
                정보 다시 입력
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
