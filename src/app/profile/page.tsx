"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { loadProfile, saveProfile } from "@/lib/storage";
import { useAccount } from "@/lib/account";
import { SIDO_LIST, JOB_STATUSES, CATEGORIES, sidoNameByCode } from "@/lib/regions";
import type { UserProfile } from "@/lib/youth/types";

// 프로필 페이지 — 원본(장재영 브랜치 /profile + /auth, 이윤호 브랜치 profile-form)의
// 회원가입/로그인 + 프로필 설정을 로컬 계정(youth.account) + youth.profile 폼으로 이식.

/** 뉴스레터 구독 상태 (youth.newsletter — 뉴스 기능이 쓰는 키를 읽기만 함) */
interface Newsletter {
  email?: string;
  subscribed?: boolean;
}

/** 내 활동 요약 */
interface ActivitySummary {
  bookmarks: number; // 저장한 정책 수
  reviews: number; // 작성한 후기 수
  diagnosed: boolean; // 자가진단 완료 여부
  points: number; // 리워드 포인트
}

function readNewsletter(): Newsletter | null {
  try {
    const raw = localStorage.getItem("youth.newsletter");
    return raw ? (JSON.parse(raw) as Newsletter) : null;
  } catch {
    return null;
  }
}

function readActivity(): ActivitySummary {
  const summary: ActivitySummary = { bookmarks: 0, reviews: 0, diagnosed: false, points: 0 };
  try {
    const raw = localStorage.getItem("youth.bookmarks");
    const arr = raw ? JSON.parse(raw) : [];
    summary.bookmarks = Array.isArray(arr) ? arr.length : 0;
  } catch {
    /* 무시 */
  }
  // 정책별 후기(youth.reviews.<plcyNo>)를 모두 합산
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("youth.reviews.")) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(arr)) summary.reviews += arr.length;
    } catch {
      /* 무시 */
    }
  }
  summary.diagnosed = localStorage.getItem("youth.diagnosis") !== null;
  try {
    const raw = localStorage.getItem("youth.rewards");
    if (raw) {
      const rewards = JSON.parse(raw) as { points?: number };
      summary.points = typeof rewards.points === "number" ? rewards.points : 0;
    }
  } catch {
    /* 무시 */
  }
  return summary;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage() {
  const { account, loaded: accountLoaded, create, remove } = useAccount();

  // --- 로컬 계정(회원가입) 폼 상태 ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountError, setAccountError] = useState("");

  // --- 내 정보(맞춤 조건) 폼 상태 — 온보딩과 동일한 입력 UI 패턴 ---
  const [age, setAge] = useState("");
  const [sidoCode, setSidoCode] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [jobCode, setJobCode] = useState("");
  const [income, setIncome] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [savedMsg, setSavedMsg] = useState("");

  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);

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
    setNewsletter(readNewsletter());
    setActivity(readActivity());
  }, []);

  const sigunguList = useMemo(
    () => SIDO_LIST.find((s) => s.code === sidoCode)?.sigungu ?? [],
    [sidoCode],
  );

  /** 로컬 계정 생성 — 원본의 회원가입/로그인을 로컬 계정 생성으로 단순화 */
  const handleCreateAccount = (e: FormEvent) => {
    e.preventDefault();
    setAccountError("");
    if (!name.trim()) {
      setAccountError("이름을 입력해주세요.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setAccountError("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    create(name, email);
    setName("");
    setEmail("");
  };

  /** 로컬 계정 삭제(로그아웃) */
  const handleRemoveAccount = () => {
    if (!confirm("로컬 계정을 삭제할까요? 이 브라우저의 계정 정보만 지워지고, 내 정보·저장한 정책은 유지돼요.")) return;
    remove();
  };

  /** 내 정보 저장 */
  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    const profile: UserProfile = {
      age: age ? Number(age) : undefined,
      regionCode: regionCode || undefined,
      sidoCode: !regionCode && sidoCode ? sidoCode : undefined,
      jobCode: jobCode || undefined,
      income: income ? Number(income) : undefined,
      interests: interests.length > 0 ? interests : undefined,
    };
    saveProfile(profile);
    setSavedMsg("✅ 내 정보가 저장됐어요. 맞춤 정책에 바로 반영돼요.");
    window.setTimeout(() => setSavedMsg(""), 3000);
  };

  const regionLabel = regionCode
    ? `${sidoNameByCode(regionCode)} ${sigunguList.find((g) => g.code === regionCode)?.name ?? ""}`.trim()
    : sidoCode
      ? sidoNameByCode(sidoCode)
      : "전국";

  return (
    <>
      <div className="header">
        <h1>프로필</h1>
        <div className="sub">내 계정과 맞춤 조건을 관리해요</div>
      </div>

      <div className="section">
        {/* ------- 로컬 계정 ------- */}
        <div className="section-title">로컬 계정</div>
        <div className="card">
          {!accountLoaded ? (
            <div className="loading">불러오는 중…</div>
          ) : account ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 32 }} aria-hidden>
                  👤
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{account.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-sub)", wordBreak: "break-all" }}>
                    {account.email}
                  </div>
                </div>
                <span className="tag green" style={{ marginLeft: "auto", flex: "0 0 auto" }}>
                  로그인됨
                </span>
              </div>
              <div className="stat-row" style={{ marginTop: 8 }}>
                <span className="stat-label">계정 생성일</span>
                <span className="stat-value">
                  {new Date(account.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <button
                type="button"
                className="btn secondary small"
                style={{ marginTop: 12 }}
                onClick={handleRemoveAccount}
              >
                로그아웃 (계정 삭제)
              </button>
            </>
          ) : (
            <>
              <div className="notice blue" style={{ marginBottom: 16 }}>
                이 앱은 서버 회원가입 없이 <b>이 브라우저에만 저장되는 로컬 계정</b>을 사용해요.
                이름과 이메일을 등록하면 회원가입/로그인과 같은 효과예요.
              </div>
              <form onSubmit={handleCreateAccount}>
                <div className="field">
                  <label>이름</label>
                  <input
                    type="text"
                    placeholder="예: 김청년"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>이메일 주소</label>
                  <input
                    type="email"
                    inputMode="email"
                    placeholder="예: youth@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {accountError && (
                  <div className="notice" style={{ color: "var(--red)", marginBottom: 12 }}>
                    ⚠️ {accountError}
                  </div>
                )}
                <button type="submit" className="btn">
                  로컬 계정 만들기 (회원가입)
                </button>
              </form>
            </>
          )}
        </div>

        {/* ------- 내 정보 (맞춤 조건) ------- */}
        <div className="section-title">
          내 정보 <small>맞춤 정책을 찾는 기준이에요 · 현재 {regionLabel}</small>
        </div>
        <form className="card" onSubmit={handleSaveProfile}>
          <div className="field">
            <label>나이 (만)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="예: 25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

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

          <div className="field">
            <label>관심 분야 (복수 선택)</label>
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

          {savedMsg && (
            <div className="notice blue" style={{ marginBottom: 12 }}>
              {savedMsg}
            </div>
          )}

          <button type="submit" className="btn">
            내 정보 저장
          </button>
          <Link
            href="/onboarding"
            className="btn secondary"
            style={{ marginTop: 8, textAlign: "center" }}
          >
            온보딩으로 처음부터 다시 입력
          </Link>
        </form>

        {/* ------- 뉴스레터 구독 상태 ------- */}
        <div className="section-title">뉴스레터</div>
        <div className="card">
          <div className="stat-row">
            <span className="stat-label">구독 상태</span>
            {newsletter?.subscribed ? (
              <span className="tag green">구독 중</span>
            ) : (
              <span className="tag">미구독</span>
            )}
          </div>
          {newsletter?.subscribed && newsletter.email && (
            <div className="stat-row">
              <span className="stat-label">수신 이메일</span>
              <span className="stat-value" style={{ wordBreak: "break-all" }}>
                {newsletter.email}
              </span>
            </div>
          )}
          <div className="hint" style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 8 }}>
            구독 신청·해지는{" "}
            <Link href="/news" style={{ color: "var(--toss-blue)" }}>
              정책 뉴스
            </Link>{" "}
            페이지에서 할 수 있어요.
          </div>
        </div>

        {/* ------- 내 활동 요약 ------- */}
        <div className="section-title">내 활동</div>
        <div className="card">
          {activity === null ? (
            <div className="loading">불러오는 중…</div>
          ) : (
            <>
              <div className="stat-row">
                <span className="stat-label">저장한 정책</span>
                <Link href="/saved" className="stat-value blue">
                  {activity.bookmarks}개 ›
                </Link>
              </div>
              <div className="stat-row">
                <span className="stat-label">작성한 후기</span>
                <span className="stat-value">{activity.reviews}개</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">자가진단</span>
                {activity.diagnosed ? (
                  <span className="tag green">완료</span>
                ) : (
                  <Link href="/diagnosis" className="stat-value blue">
                    미완료 · 하러가기 ›
                  </Link>
                )}
              </div>
              <div className="stat-row">
                <span className="stat-label">리워드 포인트</span>
                <span className="stat-value blue">{activity.points.toLocaleString()}P</span>
              </div>
            </>
          )}
        </div>

        <div className="notice" style={{ marginTop: 8 }}>
          모든 정보는 이 브라우저(localStorage)에만 저장되고 서버로 전송되지 않아요.
        </div>
      </div>
    </>
  );
}
