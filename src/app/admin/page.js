'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [policies, setPolicies] = useState([]);
  
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

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "32px", alignItems: "start" }}>
        
        {/* 1. Policy List */}
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>등록된 정책 현황</span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>총 {policies.length}개</span>
          </h2>

          {policies.length > 0 ? (
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
                  {policies.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: "700", fontSize: "14px" }}>{p.title}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
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
    </div>
  );
}
