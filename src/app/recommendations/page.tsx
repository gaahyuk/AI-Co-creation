import Link from "next/link";
import PersonalizedRecommendations from "./personalized-recommendations";

// 🎯 맞춤형 추천 정책 — 프로필 + 자가진단 결과 기반 매칭엔진 스코어링 (원본: 이윤호 /recommendations 포팅)
export default function RecommendationsPage() {
  return (
    <>
      <div className="header">
        <h1>🎯 맞춤 추천</h1>
        <div className="sub">
          내 프로필과 자가진단 결과로 매칭도를 계산했어요 ·{" "}
          <Link href="/onboarding" style={{ color: "var(--toss-blue)" }}>
            정보 수정
          </Link>
        </div>
      </div>

      <div className="section">
        <PersonalizedRecommendations />
      </div>
    </>
  );
}
