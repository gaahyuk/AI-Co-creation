"use client";

// 1초 데모 원클릭 로그인 (참조: 장재영 브랜치 src/app/auth/login/page.js 의 "테스트 계정으로 1초 로그인")
// 원본은 Supabase 가상 계정을 생성/로그인해 완비된 매칭 대시보드를 즉시 보여줬다.
// 베이스는 인증/DB가 없으므로, 동일한 체험 프로필(만26세/인천/취업준비생/중위소득 100% 이하)을
// localStorage(youth.profile, youth.diagnosis, youth.account)에 직접 주입해 같은 효과를 낸다.
// 회원가입/온보딩 4단계 입력 없이 버튼 한 번으로 완성된 대시보드 체험을 제공하는 것이 목적.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/lib/storage";
import { saveAccount } from "@/lib/account";
import { buildDiagnosis, saveDiagnosis, diagnosisToProfile } from "@/lib/diagnosis";
import type { DiagnosisAnswers } from "@/lib/diagnosis";

/** 체험용 가상 프로필: 만 26세 · 인천광역시 · 취업준비생 · 중위소득 100% 이하 */
function buildDemoAnswers(): DiagnosisAnswers {
  // 생년월일은 매번 "현재 기준 만 26세"가 되도록 동적으로 계산 (1월 2일 고정 → 연중 항상 만 26세 유지)
  const birthYear = new Date().getFullYear() - 26;
  return {
    birthDate: `${birthYear}-01-02`,
    sidoCode: "28", // 인천광역시
    regionCode: "",
    employmentId: "취업준비생",
    incomeLevelId: "le100", // 중위소득 100% 이하
    interests: [],
  };
}

export default function OnboardingDemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const startDemo = () => {
    setLoading(true);
    try {
      const answers = buildDemoAnswers();
      const result = buildDiagnosis(answers);
      saveDiagnosis(result);
      saveProfile(diagnosisToProfile(result));
      saveAccount({
        name: "체험 사용자",
        email: "demo@youthpolicy.app",
        createdAt: new Date().toISOString(),
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="header">
        <h1>1초 체험 로그인</h1>
        <div className="sub">회원가입·정보 입력 없이 완성된 프로필로 바로 체험해보세요</div>
      </div>

      <div className="section">
        <div className="card">
          <h3 style={{ margin: 0, fontSize: 15 }}>👤 체험 프로필 미리보기</h3>
          <div style={{ marginTop: 6 }}>
            <div className="stat-row">
              <span className="stat-label">나이</span>
              <span className="stat-value">만 26세</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">거주 지역</span>
              <span className="stat-value">인천광역시</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">취업 상태</span>
              <span className="stat-value">취업준비생</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">소득 수준</span>
              <span className="stat-value">중위소득 100% 이하</span>
            </div>
          </div>
        </div>

        <button className="btn" onClick={startDemo} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? "체험 환경 준비 중…" : "✨ 체험 프로필로 1초 시작하기"}
        </button>

        <div className="notice" style={{ marginTop: 12 }}>
          버튼을 누르면 현재 저장된 내 프로필·진단 결과·계정 정보가 위 체험용 데이터로
          대체돼요. 나중에 [프로필]에서 언제든 내 정보로 다시 바꿀 수 있어요.
        </div>

        <button
          className="btn secondary"
          style={{ marginTop: 8 }}
          onClick={() => router.push("/onboarding")}
        >
          아니요, 제 정보를 직접 입력할게요
        </button>
      </div>
    </>
  );
}
