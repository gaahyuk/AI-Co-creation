'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [policies, setPolicies] = useState([]);
  
  // Detail Modal State
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  
  // Form states
  const [policyId, setPolicyId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("주거");
  const [minAge, setMinAge] = useState("19");
  const [maxAge, setMaxAge] = useState("39");
  const [locations, setLocations] = useState("전국");
  const [jobs, setJobs] = useState("전체");
  const [incomeLimit, setIncomeLimit] = useState("");
  const [benefitAmount, setBenefitAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [requiredDocs, setRequiredDocs] = useState("주민등록등본, 소득금액증명원");
  const [referenceUrl, setReferenceUrl] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 1. Verify Admin Status & Fetch Policies
  useEffect(() => {
    const verifyAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/auth/login");
        return;
      }

      try {
        // Check admin role
        const { data: profile, error: profError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (profError) throw profError;

        if (!profile || !profile.is_admin) {
          alert("관리자 권한이 없습니다. 대시보드로 이동합니다.");
          router.push("/dashboard");
          return;
        }

        // Fetch Policies
        const { data: pols, error: polsError } = await supabase
          .from("policies")
          .select("*")
          .order("created_at", { ascending: false });

        if (polsError) throw polsError;
        setPolicies(pols || []);

      } catch (err) {
        console.error("[Admin Load Error]:", err.message);
        setErrorMsg("데이터를 로드하는 과정에서 에러가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [router]);

  // 2. Fetch Policies Helper
  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from("policies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPolicies(data || []);
    } catch (err) {
      console.error("[Fetch Policies Error]:", err.message);
    }
  };

  // 3. Sync Policies Handler
  const handleSyncPolicies = async () => {
    setSyncLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/policies/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "동기화 실패");
      }
      setSuccessMsg(`🔄 ${data.message}`);
      await fetchPolicies();
    } catch (err) {
      setErrorMsg(`동기화 에러: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // 4. Approve Policy Handler
  const handleApprovePolicy = async (id, title) => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const { error } = await supabase
        .from("policies")
        .update({ is_active: true, is_verified: true })
        .eq("id", id);
      if (error) throw error;
      setSuccessMsg(`🟢 "${title}" 정책이 검증 완료되어 일반 사용자 대시보드에 실시간 노출 개시되었습니다!`);
      await fetchPolicies();
    } catch (err) {
      setErrorMsg(`승인 에러: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Create Policy Handler
  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!policyId.trim() || !title.trim() || !benefitAmount || !deadline || !description.trim()) {
      setErrorMsg("필수 필드를 모두 입력해 주세요.");
      return;
    }

    setActionLoading(true);

    // Parse array inputs (comma split & trim)
    const eligibleLocations = locations.split(",").map(x => x.trim()).filter(Boolean);
    const eligibleJobs = jobs.split(",").map(x => x.trim()).filter(Boolean);
    const reqDocs = requiredDocs.split(",").map(x => x.trim()).filter(Boolean);

    try {
      const { error } = await supabase
        .from("policies")
        .insert({
          id: policyId.trim(),
          title: title.trim(),
          category,
          min_age: minAge ? parseInt(minAge, 10) : null,
          max_age: maxAge ? parseInt(maxAge, 10) : null,
          eligible_locations: eligibleLocations,
          eligible_jobs: eligibleJobs,
          income_limit: incomeLimit ? `중위소득 ${incomeLimit}% 이하` : null,
          benefit_amount: parseInt(benefitAmount, 10),
          deadline: new Date(deadline).toISOString(),
          description: description.trim(),
          required_documents: reqDocs,
          reference_url: referenceUrl.trim() || null,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccessMsg(`🎉 "${title}" 정책이 데이터베이스에 실시간으로 성공적으로 등록되었습니다!`);
      
      // Reset form
      setPolicyId("");
      setTitle("");
      setBenefitAmount("");
      setDeadline("");
      setDescription("");
      setReferenceUrl("");
      
      // Refresh list
      await fetchPolicies();
    } catch (err) {
      setErrorMsg(`정책 등록 실패: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Delete Policy Handler
  const handleDeletePolicy = async (id, name) => {
    if (!confirm(`"${name}" 정책을 정말 삭제하시겠습니까? 관련 신청 내역도 함께 지워집니다.`)) return;

    try {
      const { error } = await supabase
        .from("policies")
        .delete()
        .eq("id", id);

      if (error) throw error;

      alert(`"${name}" 정책이 성공적으로 삭제되었습니다.`);
      await fetchPolicies();
    } catch (err) {
      alert(`삭제 도중 오류 발생: ${err.message}`);
    }
  };

  const formatCurrency = (val) => {
    if (val >= 10000) return `${(val / 10000).toLocaleString()}만원`;
    return `${val.toLocaleString()}원`;
  };

  const getActualReferenceUrl = (policy) => {
    if (!policy) return "";
    
    // 온통청년 2025.07 사이트 개편으로 구 youngPlcyUnif URL이 전부 무효화됨.
    // DB에 저장된 reference_url을 직접 사용하되, 온통청년 메인 도메인만 있는 경우 통합검색으로 연결.
    if (policy.reference_url) {
      const isGenericYouthCenter = /^(https?:\/\/)?(www\.)?youthcenter\.go\.kr\/?$/.test(policy.reference_url.trim());
      if (isGenericYouthCenter) {
        return "https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch";
      }
      return policy.reference_url;
    }

    return "";
  };

  const activePolicies = policies.filter(p => p.is_verified !== false);
  const sandboxPolicies = policies.filter(p => p.is_verified === false);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h3>관리자 여부 및 권한을 검증하고 있습니다...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 id="admin-title" style={{ fontSize: "32px", fontWeight: "800", color: "var(--text-warning)" }}>🔑 관리자 모드 대시보드</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>정책 조건 데이터를 실시간으로 추가, 수정, 삭제하며 4축 매칭 진단 알고리즘을 즉석에서 검증할 수 있습니다.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ fontSize: "13px", padding: "10px 20px" }}>
          일반 사용자 대시보드 가기
        </Link>
      </div>

      {/* 🔄 Sync Control Bar */}
      <div className="checklist-container" style={{ padding: "20px 24px", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-gray)", backgroundColor: "rgba(255, 255, 255, 0.02)", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ flex: 1, minWidth: "280px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🔄 공공 정책 데이터 실시간 연동 (Sync Engine)</span>
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "4px 0 0 0", lineHeight: "1.4" }}>
            온통청년 Open API를 호출하여 최신 정책 정보를 실시간 수집하고 매칭 파이프라인으로 적재합니다. (API 키 미등록 시 자동 시뮬레이션 데이터 수집)
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ background: "var(--brand-green)", borderColor: "var(--brand-green)", color: "#121212", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}
          onClick={handleSyncPolicies}
          disabled={syncLoading}
        >
          {syncLoading ? "동기화 진행 중..." : "🚀 실시간 공공 API 수집 트리거"}
        </button>
      </div>

      {successMsg && (
        <div style={{ backgroundColor: "rgba(30, 215, 96, 0.1)", color: "var(--brand-green)", padding: "16px", borderRadius: "8px", marginBottom: "32px", fontSize: "15px", fontWeight: "700" }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ backgroundColor: "rgba(243, 114, 127, 0.1)", color: "#f3727f", padding: "16px", borderRadius: "8px", marginBottom: "32px", fontSize: "15px" }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 📥 Sandbox Policies (Verified = False) */}
      {sandboxPolicies.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-warning)" }}>
            <span>📥 외부 수집 정책 검증 & 승인 대기 (Sandbox)</span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>총 {sandboxPolicies.length}개 대기 중</span>
          </h2>
          <div className="table-container" style={{ border: "1px solid rgba(255, 164, 43, 0.2)" }}>
            <table className="custom-table" id="table-admin-sandbox">
              <thead>
                <tr style={{ backgroundColor: "rgba(255, 164, 43, 0.05)" }}>
                  <th>수집된 정책 정보</th>
                  <th>자동 파싱 조건</th>
                  <th>지원 금액</th>
                  <th>검증 조치</th>
                </tr>
              </thead>
              <tbody>
                {sandboxPolicies.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span 
                          style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-warning)", cursor: "pointer", textDecoration: "underline" }}
                          onClick={() => setSelectedPolicy(p)}
                          title="상세 모달 보기"
                        >
                          {p.title}
                        </span>
                        <Link 
                          href={`/policies/${p.id}`} 
                          target="_blank" 
                          style={{ fontSize: "11px", color: "var(--text-secondary)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "2px" }}
                        >
                          상세페이지 ↗
                        </Link>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        ID: <code>{p.id}</code> | 마감: {new Date(p.deadline).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12px" }}>
                        <span style={{ color: "var(--brand-green)" }}>나이:</span> 만 {p.min_age || 0}~{p.max_age || 150}세 <br />
                        <span style={{ color: "var(--brand-green)" }}>지역:</span> {p.eligible_locations?.join(", ")} <br />
                        <span style={{ color: "var(--brand-green)" }}>직업:</span> {p.eligible_jobs?.join(", ")} <br />
                        <span style={{ color: "var(--brand-green)" }}>소득:</span> {p.income_limit || "제한 없음"}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: "var(--brand-green)", fontSize: "13px" }}>
                        {formatCurrency(p.benefit_amount)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn-text"
                          style={{ color: "var(--brand-green)", fontSize: "12px", fontWeight: "800" }}
                          onClick={() => handleApprovePolicy(p.id, p.title)}
                        >
                          승인
                        </button>
                        <span style={{ color: "var(--border-gray)" }}>|</span>
                        <button
                          className="btn-text"
                          style={{ color: "var(--text-negative)", fontSize: "12px", fontWeight: "700" }}
                          onClick={() => handleDeletePolicy(p.id, p.title)}
                        >
                          반려
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "32px", alignItems: "start" }}>
        
        {/* 1. Policy List */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>등록된 정책 현황</span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>총 {activePolicies.length}개</span>
          </h2>

          {activePolicies.length > 0 ? (
            <div className="table-container">
              <table className="custom-table" id="table-admin-policies">
                <thead>
                  <tr>
                    <th>정책 정보</th>
                    <th>조건 필터</th>
                    <th>지원 금액</th>
                    <th>동작</th>
                  </tr>
                </thead>
                <tbody>
                  {activePolicies.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span 
                            style={{ fontWeight: "700", fontSize: "14px", cursor: "pointer", textDecoration: "underline", color: "var(--text-primary)" }}
                            onClick={() => setSelectedPolicy(p)}
                            title="상세 모달 보기"
                          >
                            {p.title}
                          </span>
                          <Link 
                            href={`/policies/${p.id}`} 
                            target="_blank" 
                            style={{ fontSize: "11px", color: "var(--text-secondary)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "2px" }}
                          >
                            상세페이지 ↗
                          </Link>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                          ID: <code>{p.id}</code> | 마감: {new Date(p.deadline).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px" }}>
                          <span style={{ color: "var(--brand-green)" }}>나이:</span> 만 {p.min_age || 0}~{p.max_age || 150}세 <br />
                          <span style={{ color: "var(--brand-green)" }}>지역:</span> {p.eligible_locations?.join(", ")} <br />
                          <span style={{ color: "var(--brand-green)" }}>직업:</span> {p.eligible_jobs?.join(", ")} <br />
                          <span style={{ color: "var(--brand-green)" }}>소득:</span> {p.income_limit || "제한 없음"}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: "700", color: "var(--brand-green)", fontSize: "13px" }}>
                          {formatCurrency(p.benefit_amount)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-text"
                          style={{ color: "var(--text-negative)", fontSize: "12px", fontWeight: "700" }}
                          onClick={() => handleDeletePolicy(p.id, p.title)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="checklist-container" style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "var(--text-secondary)", margin: 0 }}>등록된 공공 정책 정보가 없습니다. 우측 폼을 이용해 첫 정책 데이터를 등록해보세요!</p>
            </div>
          )}
        </div>

        {/* 2. Create Policy Form */}
        <div className="form-box" style={{ margin: 0, padding: "28px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "20px", borderBottom: "1px solid var(--separator)", paddingBottom: "12px" }}>🆕 실시간 신규 정책 등록</h2>
          
          <form onSubmit={handleCreatePolicy}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-id">정책 고유 ID (Key) *</label>
                <input
                  type="text"
                  id="input-policy-id"
                  className="form-input"
                  placeholder="예: policy-youth-cash"
                  value={policyId}
                  onChange={(e) => setPolicyId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-title">정책 제목 *</label>
                <input
                  type="text"
                  id="input-policy-title"
                  className="form-input"
                  placeholder="예: 청년 취업성공 수당"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="select-policy-cat">카테고리 *</label>
                <select
                  id="select-policy-cat"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="주거">🏠 주거</option>
                  <option value="금융">💵 금융</option>
                  <option value="일자리">💼 일자리</option>
                  <option value="기타">⚡ 기타</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-benefit">지원 혜택 금액 (원) *</label>
                <input
                  type="number"
                  id="input-policy-benefit"
                  className="form-input"
                  placeholder="예: 3000000"
                  value={benefitAmount}
                  onChange={(e) => setBenefitAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-minage">최소 연령 제한 (만)</label>
                <input
                  type="number"
                  id="input-policy-minage"
                  className="form-input"
                  placeholder="예: 19"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-maxage">최대 연령 제한 (만)</label>
                <input
                  type="number"
                  id="input-policy-maxage"
                  className="form-input"
                  placeholder="예: 39"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label" htmlFor="input-policy-locations">대상 거주지역 (콤마 구분) *</label>
              <input
                type="text"
                id="input-policy-locations"
                className="form-input"
                placeholder="예: 전국 또는 서울특별시, 인천광역시"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px", marginTop: "12px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-jobs">지원 대상 고용 형태 (콤마 구분)</label>
                <input
                  type="text"
                  id="input-policy-jobs"
                  className="form-input"
                  placeholder="예: 전체 또는 대학생, 취업준비생"
                  value={jobs}
                  onChange={(e) => setJobs(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-income">소득 제한 (중위소득 %)</label>
                <input
                  type="number"
                  id="input-policy-income"
                  className="form-input"
                  placeholder="예: 120 (비워두면 제한없음)"
                  value={incomeLimit}
                  onChange={(e) => setIncomeLimit(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px", marginTop: "12px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-docs">필수 구비 서류 (콤마 구분)</label>
                <input
                  type="text"
                  id="input-policy-docs"
                  className="form-input"
                  placeholder="예: 주민등록등본, 소득금액증명원"
                  value={requiredDocs}
                  onChange={(e) => setRequiredDocs(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="input-policy-deadline">신청 마감일 *</label>
                <input
                  type="date"
                  id="input-policy-deadline"
                  className="form-input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label" htmlFor="input-policy-refurl">실제 정책 웹사이트 URL (선택)</label>
              <input
                type="url"
                id="input-policy-refurl"
                className="form-input"
                placeholder="예: https://www.youthcenter.go.kr/..."
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label" htmlFor="textarea-policy-desc">정책 상세 설명 *</label>
              <textarea
                id="textarea-policy-desc"
                className="form-input"
                style={{ height: "100px", resize: "none", padding: "12px", fontFamily: "inherit", fontSize: "14px" }}
                placeholder="정책 혜택 및 세부 선발 요건을 적어주세요."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              id="btn-admin-submit"
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "24px", background: "var(--text-warning)", borderColor: "var(--text-warning)", color: "#121212", fontWeight: "800" }}
              disabled={actionLoading}
            >
              {actionLoading ? "DB 등록 중..." : "🚀 신규 정책 데이터 실시간 등록"}
            </button>
          </form>
        </div>

      </div>

      {/* 🔍 Premium Detail Modal */}
      {selectedPolicy && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px"
          }} 
          onClick={() => setSelectedPolicy(null)}
        >
          <div 
            style={{
              backgroundColor: "#16161a",
              border: "1px solid var(--border-gray)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "640px",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative"
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "16px" }}>
              <span style={{ backgroundColor: "rgba(30, 215, 96, 0.12)", color: "var(--brand-green)", fontSize: "12px", fontWeight: "800", padding: "6px 12px", borderRadius: "6px" }}>
                🏷️ {selectedPolicy.category}
              </span>
              <button 
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "24px", cursor: "pointer", transition: "color 0.2s" }}
                onClick={() => setSelectedPolicy(null)}
                onMouseEnter={(e) => e.target.style.color = "#ffffff"}
                onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
              >
                ✕
              </button>
            </div>

            <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", marginBottom: "20px", lineHeight: "1.3" }}>
              {selectedPolicy.title}
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px", backgroundColor: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>정책 고유 Key ID</span>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", fontFamily: "monospace" }}>{selectedPolicy.id}</div>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>지원 혜택 규모</span>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "var(--brand-green)" }}>{formatCurrency(selectedPolicy.benefit_amount)}</div>
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>수혜 대상 연령 제한</span>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>만 {selectedPolicy.min_age || 0}~{selectedPolicy.max_age || 150}세</div>
              </div>
              <div style={{ marginTop: "8px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>신청 마감일자</span>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>{new Date(selectedPolicy.deadline).toLocaleDateString()}</div>
              </div>
            </div>

            <div style={{ marginBottom: "24px", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "10px", fontWeight: "700" }}>🎯 맞춤형 4축 타겟 요건</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", fontSize: "13px" }}>
                <div>📍 <strong style={{ color: "var(--brand-green)" }}>지역:</strong> {selectedPolicy.eligible_locations?.join(", ") || "전국"}</div>
                <div>💼 <strong style={{ color: "var(--brand-green)" }}>직업:</strong> {selectedPolicy.eligible_jobs?.join(", ") || "전체"}</div>
                <div>💰 <strong style={{ color: "var(--brand-green)" }}>소득한도:</strong> {selectedPolicy.income_limit || "제한 없음"}</div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "8px", fontWeight: "700" }}>📝 상세 설명 및 혜택 요건</span>
              <div style={{ 
                fontSize: "14px", 
                color: "rgba(255,255,255,0.9)", 
                lineHeight: "1.6", 
                whiteSpace: "pre-wrap", 
                backgroundColor: "rgba(255,255,255,0.01)", 
                padding: "16px", 
                borderRadius: "8px", 
                border: "1px solid rgba(255,255,255,0.04)",
                maxHeight: "200px",
                overflowY: "auto"
              }}>
                {selectedPolicy.description}
              </div>
            </div>

            {selectedPolicy.required_documents && selectedPolicy.required_documents.length > 0 && (
              <div style={{ marginBottom: "28px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "block", marginBottom: "8px", fontWeight: "700" }}>📄 필수 구비 서류 목록</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedPolicy.required_documents.map((doc, idx) => (
                    <span key={idx} style={{ fontSize: "12px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "6px 14px", borderRadius: "20px", color: "var(--text-primary)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      📄 {doc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "20px", flexWrap: "wrap" }}>
              <Link 
                href={`/policies/${selectedPolicy.id}`}
                target="_blank"
                className="btn btn-secondary"
                style={{ flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "14px", padding: "12px 0", minWidth: "150px" }}
              >
                상세 페이지 미리보기 ↗
              </Link>
              {getActualReferenceUrl(selectedPolicy) && (
                <a 
                  href={getActualReferenceUrl(selectedPolicy)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ 
                    flex: 1, 
                    textAlign: "center", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "6px", 
                    fontSize: "14px", 
                    padding: "12px 0",
                    backgroundColor: "rgba(255, 164, 43, 0.15)",
                    border: "1px solid var(--text-warning)",
                    color: "var(--text-warning)",
                    fontWeight: "700",
                    minWidth: "150px"
                  }}
                >
                  🏛️ 실제 원문 사이트 ↗
                </a>
              )}
              {selectedPolicy.is_verified === false ? (
                <button 
                  className="btn btn-primary"
                  style={{ flex: 1.2, backgroundColor: "var(--brand-green)", borderColor: "var(--brand-green)", color: "#121212", fontWeight: "800", fontSize: "14px", padding: "12px 0", minWidth: "150px" }}
                  onClick={() => {
                    handleApprovePolicy(selectedPolicy.id, selectedPolicy.title);
                    setSelectedPolicy(null);
                  }}
                >
                  🟢 최종 검증 승인
                </button>
              ) : (
                <button 
                  className="btn btn-secondary"
                  style={{ flex: 0.6, color: "var(--text-secondary)", fontSize: "14px", padding: "12px 0", minWidth: "80px" }}
                  onClick={() => setSelectedPolicy(null)}
                >
                  닫기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
