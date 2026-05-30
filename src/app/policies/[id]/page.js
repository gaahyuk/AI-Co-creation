'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { diagnosePolicy } from "@/lib/diagnosis";

export default function PolicyDetail({ params }) {
  const router = useRouter();
  const { id } = params;
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchPolicyData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/auth/login");
        return;
      }
      setUser(session.user);

      try {
        // 1. Fetch profile
        const { data: prof, error: profError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profError && profError.code !== "PGRST116") throw profError;
        setProfile(prof || null);

        // 2. Fetch specific policy
        const { data: pol, error: polError } = await supabase
          .from("policies")
          .select("*")
          .eq("id", id)
          .single();

        if (polError) throw polError;
        setPolicy(pol);

        // 3. Check if policy is saved in wallet
        const { data: app, error: appError } = await supabase
          .from("applications")
          .select("status")
          .eq("user_id", session.user.id)
          .eq("policy_id", id)
          .single();

        if (appError && appError.code !== "PGRST116") throw appError;
        setIsSaved(!!app);

      } catch (err) {
        console.error("[Policy Detail Error]:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyData();
  }, [id, router]);

  const handleWalletToggle = async () => {
    if (!user || !policy) return;
    setActionLoading(true);

    try {
      if (isSaved) {
        // Delete from saved
        const { error } = await supabase
          .from("applications")
          .delete()
          .eq("user_id", user.id)
          .eq("policy_id", policy.id);

        if (error) throw error;
        setIsSaved(false);
        console.log(`[Policy Wallet] 정책 해제 완료: ${policy.id}`);
      } else {
        // Save
        const { error } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            policy_id: policy.id,
            status: "saved",
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        setIsSaved(true);
        console.log(`[Policy Wallet] 정책 저장 완료: ${policy.id}`);
      }
    } catch (err) {
      alert("처리에 실패했습니다: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h3>정책 상세 정보를 가져오는 중...</h3>
      </div>
    );
  }

  if (!policy) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h3>요청하신 정책을 찾을 수 없습니다.</h3>
        <Link href="/dashboard" className="btn btn-secondary" style={{ marginTop: "24px" }}>
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  // Run diagnosis
  const diagnosis = profile ? diagnosePolicy(profile, policy) : { isEligible: false, score: 0, details: {} };
  const score = diagnosis.score;

  const formatCurrency = (val) => {
    if (val >= 100000000) return `${(val / 100000000).toFixed(1)}억원`;
    if (val >= 10000) return `${(val / 10000).toLocaleString()}만원`;
    return `${val.toLocaleString()}원`;
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 0" }}>
      {/* Back to Dashboard Link */}
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", marginBottom: "24px", fontSize: "14px", fontWeight: "700" }}>
        <span>←</span> <span>대시보드로 돌아가기</span>
      </Link>

      {/* Header Info */}
      <section className="dashboard-hero" style={{ padding: "40px" }}>
        <span className="card-category" style={{ marginBottom: "16px" }}>{policy.category}</span>
        <h1 style={{ marginBottom: "12px", fontSize: "36px" }}>{policy.title}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px", marginBottom: "24px", lineHeight: "1.6" }}>
          {policy.description}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "24px" }}>
          <div>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "1px", display: "block" }}>지원 혜택</span>
            <span style={{ fontSize: "32px", fontWeight: "800", color: "var(--brand-green)" }}>
              {formatCurrency(policy.benefit_amount)}
            </span>
          </div>
          <div>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "1px", display: "block", textAlign: "right" }}>신청 마감일</span>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff" }}>
              {new Date(policy.deadline).toLocaleDateString()}
            </span>
          </div>
        </div>
      </section>

      {/* Matching Diagnosis Section */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>자격 조건 진단표</h2>
        <div className="checklist-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--separator)" }}>
            <span style={{ fontSize: "16px", fontWeight: "700" }}>종합 적합도 분석</span>
            <span className={`match-score-badge ${score >= 90 ? 'high' : score >= 60 ? 'mid' : 'low'}`} style={{ fontSize: "16px", padding: "8px 24px" }}>
              적합도 {score}%
            </span>
          </div>

          <div className="checklist-item">
            <div className="checklist-left">
              <span className={`check-badge ${diagnosis.details.age?.pass ? 'pass' : 'fail'}`}>
                {diagnosis.details.age?.pass ? "✓" : "✕"}
              </span>
              <div>
                <div className="checklist-title">나이 요건</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  정책 기준: 만 {policy.min_age || 0}세 ~ {policy.max_age || 150}세
                </div>
              </div>
            </div>
            <span className="checklist-val" style={{ color: diagnosis.details.age?.pass ? "var(--brand-green)" : "var(--text-negative)", fontWeight: "700" }}>
              {diagnosis.details.age?.message}
            </span>
          </div>

          <div className="checklist-item">
            <div className="checklist-left">
              <span className={`check-badge ${diagnosis.details.location?.pass ? 'pass' : 'fail'}`}>
                {diagnosis.details.location?.pass ? "✓" : "✕"}
              </span>
              <div>
                <div className="checklist-title">거주지 요건</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  정책 기준: {policy.eligible_locations?.join(", ") || "제한 없음"}
                </div>
              </div>
            </div>
            <span className="checklist-val" style={{ color: diagnosis.details.location?.pass ? "var(--brand-green)" : "var(--text-negative)", fontWeight: "700" }}>
              {diagnosis.details.location?.message}
            </span>
          </div>

          <div className="checklist-item">
            <div className="checklist-left">
              <span className={`check-badge ${diagnosis.details.job?.pass ? 'pass' : 'fail'}`}>
                {diagnosis.details.job?.pass ? "✓" : "✕"}
              </span>
              <div>
                <div className="checklist-title">고용 형태 / 직업 요건</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  정책 기준: {policy.eligible_jobs?.join(", ") || "제한 없음"}
                </div>
              </div>
            </div>
            <span className="checklist-val" style={{ color: diagnosis.details.job?.pass ? "var(--brand-green)" : "var(--text-negative)", fontWeight: "700" }}>
              {diagnosis.details.job?.message}
            </span>
          </div>

          <div className="checklist-item">
            <div className="checklist-left">
              <span className={`check-badge ${diagnosis.details.income?.pass ? 'pass' : 'fail'}`}>
                {diagnosis.details.income?.pass ? "✓" : "✕"}
              </span>
              <div>
                <div className="checklist-title">소득 요건</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  정책 기준: {policy.income_limit ? `기준중위소득 ${policy.income_limit} 이하` : "제한 없음"}
                </div>
              </div>
            </div>
            <span className="checklist-val" style={{ color: diagnosis.details.income?.pass ? "var(--brand-green)" : "var(--text-negative)", fontWeight: "700" }}>
              {diagnosis.details.income?.message}
            </span>
          </div>
        </div>
      </section>

      {/* Required Documents Section */}
      <section style={{ marginBottom: "40px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>신청 시 구비 서류</h2>
        <div className="checklist-container" style={{ padding: "24px" }}>
          {policy.required_documents && policy.required_documents.length > 0 ? (
            <ul style={{ listStyleType: "none", padding: 0 }}>
              {policy.required_documents.map((doc, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: idx === policy.required_documents.length - 1 ? "none" : "1px solid var(--separator)" }}>
                  <span style={{ color: "var(--brand-green)" }}>📄</span>
                  <span style={{ fontSize: "14px", fontWeight: "700" }}>{doc}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>필요한 구비서류 정보가 명시되어 있지 않습니다.</p>
          )}
        </div>
      </section>

      {/* Action Buttons */}
      <section style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
        <button
          id="btn-detail-wallet-toggle"
          className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
          style={{ flex: 1 }}
          onClick={handleWalletToggle}
          disabled={actionLoading}
        >
          {isSaved ? "지갑에서 해제" : "내 지갑에 저장하기"}
        </button>

        {diagnosis.isEligible && isSaved && (
          <Link href="/wallet" className="btn btn-primary" style={{ flex: 1, textAlign: "center", backgroundColor: "var(--text-announcement)", color: "#ffffff" }} id="btn-detail-prepare-docs">
            서류 준비하러 가기
          </Link>
        )}
      </section>
    </div>
  );
}
