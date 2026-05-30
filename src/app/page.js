'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { seedPolicies } from "@/lib/policies-seed";

export default function Home() {
  const [user, setUser] = useState(null);
  const [seedingStatus, setSeedingStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSeedClick = async () => {
    setSeedingStatus("시딩 진행 중...");
    const result = await seedPolicies();
    if (result.success) {
      if (result.bypassed) {
        setSeedingStatus("✅ 이미 기존 정책 데이터가 데이터베이스에 존재합니다.");
      } else {
        setSeedingStatus(`✅ 정책 시드 데이터 ${result.count}개가 정상 등록되었습니다!`);
      }
    } else {
      setSeedingStatus(`❌ 시딩 실패: ${result.error}. Supabase 설정 및 테이블 생성 여부를 확인하세요.`);
    }
  };

  return (
    <div style={{ padding: "40px 0", maxWidth: "900px", margin: "0 auto" }}>
      {/* Hero Section */}
      <section style={{ textAlign: "center", padding: "60px 20px", marginBottom: "40px" }} className="dashboard-hero">
        <h1 style={{ fontSize: "48px", fontWeight: "800", color: "#ffffff", marginBottom: "16px" }}>
          정책을 검색하는 시대를 끝내다.
        </h1>
        <p style={{ fontSize: "18px", color: "#b3b3b3", maxWidth: "600px", margin: "0 auto 32px auto", lineHeight: "1.6" }}>
          AI와 맞춤형 진단 규칙이 매칭하는 나만의 수혜 플랫폼. 
          생년월일과 거주지만 입력하면 내가 받을 수 있는 정부·지자체 정책을 5분 이내에 판별해 드립니다.
        </p>
        
        {!loading && (
          <div>
            {user ? (
              <Link href="/dashboard" className="btn btn-primary" id="landing-cta-dashboard">
                대시보드로 가기
              </Link>
            ) : (
              <Link href="/auth/login" className="btn btn-primary" id="landing-cta-login">
                지금 시작하기 (무료 로그인)
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Feature Cards Grid */}
      <section style={{ marginBottom: "60px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "32px", fontSize: "28px" }}>핵심 서비스 기능</h2>
        <div className="grid-container">
          <div className="policy-card" style={{ cursor: "default", minHeight: "200px" }}>
            <div>
              <span className="card-category">Feature 01</span>
              <h3 className="card-title">실시간 정책 매칭</h3>
              <p className="card-desc">나이, 거주지역, 직업, 소득수준에 적합한 수혜 가능 정책들을 정밀 판별하여 매칭 점수를 산출합니다.</p>
            </div>
          </div>
          <div className="policy-card" style={{ cursor: "default", minHeight: "200px" }}>
            <div>
              <span className="card-category">Feature 02</span>
              <h3 className="card-title">Policy Wallet</h3>
              <p className="card-desc">관심 있는 정책을 보관하고 신청 진척도(저장, 신청 중, 수혜 완료)를 체계적으로 관리합니다.</p>
            </div>
          </div>
          <div className="policy-card" style={{ cursor: "default", minHeight: "200px" }}>
            <div>
              <span className="card-category">Feature 03</span>
              <h3 className="card-title">구비서류 통합 관리</h3>
              <p className="card-desc">필수 서류(PDF, 이미지)를 클라우드 지갑에 안전하게 업로드하고, 여러 정책 신청에 재사용합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Helper Tool (Seed DB) */}
      <section className="checklist-container" style={{ padding: "32px", textAlign: "center" }}>
        <h3 style={{ marginBottom: "12px", color: "#ffffff" }}>🛠️ 개발자 테스트 도구</h3>
        <p style={{ fontSize: "14px", marginBottom: "20px", color: "#b3b3b3" }}>
          Supabase 데이터베이스 세팅 완료 후, 아래 버튼을 누르면 테스트용 정책 데이터 4종(청년월세지원, 청년도약계좌 등)이 자동으로 적재됩니다.
        </p>
        <button 
          id="btn-seed-db"
          className="btn btn-secondary" 
          onClick={handleSeedClick}
        >
          데이터베이스 정책 시딩 (Seeding)
        </button>
        {seedingStatus && (
          <p style={{ marginTop: "16px", fontSize: "14px", fontWeight: "600", color: seedingStatus.includes("❌") ? "#f3727f" : "#1ed760" }}>
            {seedingStatus}
          </p>
        )}
      </section>
    </div>
  );
}
