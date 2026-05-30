'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { diagnosePolicy } from "@/lib/diagnosis";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [savedPolicyIds, setSavedPolicyIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/auth/login");
        return;
      }
      setUser(session.user);

      try {
        // 1. Fetch Profile
        const { data: prof, error: profError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profError && profError.code !== "PGRST116") throw profError;
        setProfile(prof || null);

        // 2. Fetch Policies
        const { data: pols, error: polsError } = await supabase
          .from("policies")
          .select("*");

        if (polsError) throw polsError;
        setPolicies(pols || []);

        // 3. Fetch Saved applications
        const { data: apps, error: appsError } = await supabase
          .from("applications")
          .select("policy_id")
          .eq("user_id", session.user.id);

        if (appsError) throw appsError;
        const savedIds = new Set((apps || []).map(a => a.policy_id));
        setSavedPolicyIds(savedIds);

      } catch (err) {
        console.error("[Dashboard Load Error]:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Handle Save to Wallet
  const handleSaveToWallet = async (policyId, e) => {
    e.preventDefault(); // Prevent navigating to policy details
    e.stopPropagation();
    if (!user) return;

    try {
      if (savedPolicyIds.has(policyId)) {
        // Delete from saved
        const { error } = await supabase
          .from("applications")
          .delete()
          .eq("user_id", user.id)
          .eq("policy_id", policyId);

        if (error) throw error;
        
        const newSaved = new Set(savedPolicyIds);
        newSaved.delete(policyId);
        setSavedPolicyIds(newSaved);
        console.log(`[Policy Wallet] 정책 해제 완료: ${policyId}`);
      } else {
        // Insert into saved
        const { error } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            policy_id: policyId,
            status: "saved",
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        const newSaved = new Set(savedPolicyIds);
        newSaved.add(policyId);
        setSavedPolicyIds(newSaved);
        console.log(`[Policy Wallet] 정책 저장 완료: ${policyId}`);
      }
    } catch (err) {
      alert("지갑 저장 처리에 실패했습니다: " + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h3>대시보드 데이터를 로드하고 있습니다...</h3>
      </div>
    );
  }

  // 1. Run diagnosis on all policies
  const diagnosedPolicies = policies.map(policy => {
    const diagnosis = profile ? diagnosePolicy(profile, policy) : { isEligible: false, score: 0 };
    return {
      ...policy,
      diagnosis
    };
  });

  // 2. Filter & Sort policies by suitability score
  const sortedPolicies = diagnosedPolicies
    .filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "전체" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => b.diagnosis.score - a.diagnosis.score);

  // 3. Compute North Star Metrics (Eligible total amount & Eligible counts)
  const eligiblePolicies = diagnosedPolicies.filter(p => p.diagnosis.isEligible);
  const totalEligibleAmount = eligiblePolicies.reduce((sum, p) => sum + (p.benefit_amount || 0), 0);

  const formatCurrency = (val) => {
    if (val >= 100000000) {
      return `${(val / 100000000).toFixed(1)}억원`;
    }
    if (val >= 10000) {
      return `${(val / 10000).toLocaleString()}만원`;
    }
    return `${val.toLocaleString()}원`;
  };

  const isProfileComplete = profile && profile.birth_date;

  return (
    <div>
      <h1 id="dashboard-title">내 정책 대시보드</h1>
      
      {/* Profile Incomplete Warning Banner */}
      {!isProfileComplete && (
        <div 
          className="checklist-container" 
          style={{ 
            border: "1px solid var(--text-warning)", 
            backgroundColor: "rgba(255, 164, 43, 0.05)",
            padding: "24px",
            marginBottom: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div>
            <h3 style={{ color: "var(--text-warning)", marginBottom: "4px" }}>⚠️ 프로필 정보를 입력해 주세요</h3>
            <p style={{ fontSize: "14px", margin: 0, color: "var(--text-secondary)" }}>
              아직 생년월일 및 거주지역 정보가 등록되지 않아 정확한 정책 수혜 판별을 할 수 없습니다.
            </p>
          </div>
          <Link href="/profile" className="btn btn-primary" style={{ padding: "10px 24px", fontSize: "12px" }}>
            프로필 설정하기
          </Link>
        </div>
      )}

      {/* Hero Stats Card */}
      <section className="dashboard-hero">
        <h2 style={{ fontSize: "28px", marginBottom: "4px" }}>
          {user.email.split("@")[0]}님을 위한 추천
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
          현재 입력하신 기본 자격 요건을 기반으로 즉시 수혜 가능한 금액을 실시간 연산했습니다.
        </p>

        <div className="stat-group">
          <div className="stat-card">
            <div className="stat-label">예상 수혜 가능 금액</div>
            <div className="stat-value" id="stats-total-amount">
              {isProfileComplete ? formatCurrency(totalEligibleAmount) : "계산 불가"}
            </div>
            <div className="stat-sub">
              {isProfileComplete ? `총 ${eligiblePolicies.length}개의 정책 대상 부합` : "프로필 설정을 완료해 주세요"}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">진단 완료된 정책</div>
            <div className="stat-value" style={{ color: "#ffffff" }}>
              {policies.length}개
            </div>
            <div className="stat-sub">국가 및 시드 정책 데이터</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">보관한 관심 정책</div>
            <div className="stat-value" style={{ color: "var(--text-announcement)" }}>
              {savedPolicyIds.size}개
            </div>
            <div className="stat-sub">지갑에 보관된 리스트</div>
          </div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section style={{ marginBottom: "32px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Spotify Pill Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            id="policy-search-input"
            className="form-input"
            style={{ borderRadius: "500px", paddingLeft: "20px" }}
            placeholder="정책 이름이나 상세 내용 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Pill Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["전체", "주거", "금융", "일자리"].map((cat) => (
            <button
              key={cat}
              className={`btn btn-secondary`}
              style={{
                padding: "8px 16px",
                fontSize: "12px",
                backgroundColor: selectedCategory === cat ? "var(--text-base)" : "var(--bg-mid)",
                color: selectedCategory === cat ? "var(--bg-base)" : "var(--text-base)",
                borderColor: selectedCategory === cat ? "var(--text-base)" : "var(--border-gray)"
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Recommended Policies Section */}
      <section>
        <h2 style={{ fontSize: "22px", marginBottom: "20px" }}>추천 매칭 목록</h2>
        
        {sortedPolicies.length > 0 ? (
          <div className="grid-container">
            {sortedPolicies.map((p) => {
              const score = p.diagnosis.score;
              const isEligible = p.diagnosis.isEligible;
              const isSaved = savedPolicyIds.has(p.id);

              return (
                <div 
                  key={p.id} 
                  className="policy-card"
                  onClick={() => router.push(`/policies/${p.id}`)}
                >
                  <div>
                    <span className={`card-category ${p.category === '금융' ? 'financial' : p.category === '주거' ? 'housing' : ''}`}>
                      {p.category}
                    </span>
                    <h3 className="card-title">{p.title}</h3>
                    <p className="card-desc">{p.description}</p>
                  </div>
                  
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span className="card-amount">{formatCurrency(p.benefit_amount)}</span>
                      {isProfileComplete ? (
                        <span className={`match-score-badge ${score >= 90 ? 'high' : score >= 60 ? 'mid' : 'low'}`}>
                          적합도 {score}%
                        </span>
                      ) : (
                        <span className="match-score-badge" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                          진단 대기
                        </span>
                      )}
                    </div>
                    
                    <div className="card-footer">
                      <span className="card-deadline">
                        마감: {new Date(p.deadline).toLocaleDateString()}
                      </span>
                      
                      {/* Play-button styled wallet save toggle */}
                      <button
                        className="card-action-btn"
                        onClick={(e) => handleSaveToWallet(p.id, e)}
                        title={isSaved ? "지갑에서 제거" : "지갑에 저장"}
                        style={{
                          backgroundColor: isSaved ? "#ffffff" : "var(--brand-green)",
                          opacity: isSaved ? 1 : undefined,
                          transform: isSaved ? "translateY(0)" : undefined
                        }}
                      >
                        {isSaved ? "📂" : "➕"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="checklist-container" style={{ textAlign: "center", padding: "48px" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: 0 }}>
              조건에 맞는 추천 정책이 없습니다. 검색어 또는 카테고리를 변경해 보세요.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
