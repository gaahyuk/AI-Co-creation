'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Wallet() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [savedPolicies, setSavedPolicies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("주민등록등본");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const docTypes = [
    "주민등록등본",
    "소득금액증명원",
    "임대차계약서",
    "월세이체증빙서류",
    "구직등록필증",
    "구직활동계획서",
    "기타 증빙서류"
  ];

  // Fetch saved policies & uploaded documents
  const fetchWalletData = async (userId) => {
    try {
      // 1. Fetch saved policies (Applications join Policies)
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("status, policies(*)")
        .eq("user_id", userId);

      if (appsError) throw appsError;
      setSavedPolicies(apps || []);

      // 2. Fetch uploaded documents
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);

    } catch (err) {
      console.error("[Wallet Data Fetch Error]:", err.message);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/auth/login");
        return;
      }

      setUser(session.user);
      await fetchWalletData(session.user.id);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  // Update Policy Application Status
  const handleStatusChange = async (policyId, newStatus) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("policy_id", policyId);

      if (error) throw error;
      
      // Update local state
      setSavedPolicies(prev => 
        prev.map(item => 
          item.policies.id === policyId ? { ...item, status: newStatus } : item
        )
      );
      console.log(`[Policy Wallet] 상태 업데이트 성공: ${policyId} -> ${newStatus}`);
    } catch (err) {
      alert("상태 변경에 실패했습니다: " + err.message);
    }
  };

  // Remove saved policy
  const handleRemovePolicy = async (policyId) => {
    if (!user) return;
    if (!confirm("이 정책을 지갑에서 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("user_id", user.id)
        .eq("policy_id", policyId);

      if (error) throw error;

      setSavedPolicies(prev => prev.filter(item => item.policies.id !== policyId));
      console.log(`[Policy Wallet] 지갑 제거 완료: ${policyId}`);
    } catch (err) {
      alert("정책 제거 실패: " + err.message);
    }
  };

  // Document Upload Handler (Supabase Storage + DB)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setErrorMsg("");
    setSuccessMsg("");

    // 1. File type verification
    const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
    const fileExt = file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      setErrorMsg("허용되지 않는 파일 확장자입니다. PDF, JPG, PNG 파일만 업로드할 수 있습니다.");
      return;
    }

    // 2. File size verification (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg("파일 용량이 10MB를 초과했습니다.");
      return;
    }

    setUploading(true);

    try {
      // 3. Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("policy-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        throw new Error(
          `스토리지 업로드 실패: ${uploadError.message}. ` +
          `(프로젝트에 'policy-documents' 버킷이 생성되었고 RLS 정책이 허용되었는지 확인하세요)`
        );
      }

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("policy-documents")
        .getPublicUrl(filePath);

      // 5. Insert document metadata into DB
      const { error: dbError } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          file_url: publicUrl,
          file_name: file.name,
          document_type: docType
        });

      if (dbError) throw dbError;

      setSuccessMsg(`🎉 "${file.name}" 서류가 성공적으로 업로드 및 등록되었습니다!`);
      await fetchWalletData(user.id);
    } catch (err) {
      setErrorMsg(err.message || "서류 업로드 도중 에러가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  // Delete Document Handler
  const handleDeleteDocument = async (docId, fileUrl) => {
    if (!user) return;
    if (!confirm("이 서류를 보관함에서 삭제하시겠습니까?")) return;

    try {
      // Extract storage path from URL
      // Expected structure: .../storage/v1/object/public/policy-documents/{user_id}/{fileName}
      const parts = fileUrl.split("/policy-documents/");
      if (parts.length > 1) {
        const filePath = decodeURIComponent(parts[1]);
        
        // Delete from Storage
        const { error: storageError } = await supabase.storage
          .from("policy-documents")
          .remove([filePath]);

        if (storageError) {
          console.warn("[Wallet Storage Delete Warning]:", storageError.message);
        }
      }

      // Delete from DB
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", docId)
        .eq("user_id", user.id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== docId));
      console.log(`[Document Manager] 서류 제거 성공: ${docId}`);
    } catch (err) {
      alert("서류 삭제 실패: " + err.message);
    }
  };

  const formatCurrency = (val) => {
    if (val >= 10000) return `${(val / 10000).toLocaleString()}만원`;
    return `${val.toLocaleString()}원`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h3>지갑 정보를 불러오고 있습니다...</h3>
      </div>
    );
  }

  return (
    <div>
      <h1 id="wallet-title">마이 월렛 & 서류함</h1>
      <p style={{ marginBottom: "32px" }}>
        저장한 관심 정책의 신청 과정을 관리하고, 증빙에 필요한 필수 서류를 보관하여 신속하게 신청할 수 있습니다.
      </p>

      {/* Saved Policies Section */}
      <section style={{ marginBottom: "48px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>관심 정책 및 신청 현황</h2>
        {savedPolicies.length > 0 ? (
          <div className="table-container">
            <table className="custom-table" id="table-saved-policies">
              <thead>
                <tr>
                  <th>정책 정보</th>
                  <th>카테고리</th>
                  <th>지원 혜택</th>
                  <th>신청 현황</th>
                  <th>동작</th>
                </tr>
              </thead>
              <tbody>
                {savedPolicies.map((item) => (
                  <tr key={item.policies.id}>
                    <td>
                      <Link href={`/policies/${item.policies.id}`} style={{ fontWeight: "700", textDecoration: "hover" }}>
                        {item.policies.title}
                      </Link>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        마감: {new Date(item.policies.deadline).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <span className={`card-category ${item.policies.category === '금융' ? 'financial' : item.policies.category === '주거' ? 'housing' : ''}`} style={{ fontSize: "10px" }}>
                        {item.policies.category}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: "var(--brand-green)" }}>
                        {formatCurrency(item.policies.benefit_amount)}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: "6px 32px 6px 12px", width: "auto", fontSize: "12px", borderRadius: "20px" }}
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.policies.id, e.target.value)}
                      >
                        <option value="saved">📂 저장됨</option>
                        <option value="applying">📝 신청 진행 중</option>
                        <option value="completed">🎉 수혜 완료</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn-text"
                        style={{ color: "var(--text-negative)", fontSize: "12px" }}
                        onClick={() => handleRemovePolicy(item.policies.id)}
                      >
                        지우기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="checklist-container" style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>지갑에 보관된 정책이 없습니다.</p>
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: "10px 24px", fontSize: "12px" }}>
              추천 정책 찾으러 가기
            </Link>
          </div>
        )}
      </section>

      {/* Document Manager Section */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", flexWrap: "wrap" }}>
        {/* Document Upload Area */}
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>서류 보관 및 업로드</h2>
          
          <div className="checklist-container" style={{ padding: "24px" }}>
            {errorMsg && (
              <div style={{ backgroundColor: "rgba(243, 114, 127, 0.1)", color: "#f3727f", padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px" }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{ backgroundColor: "rgba(30, 215, 96, 0.1)", color: "#1ed760", padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px" }}>
                {successMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="upload-doc-type">서류 유형 선택</label>
              <select
                id="upload-doc-type"
                className="form-select"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {docTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <label className="upload-area" style={{ display: "block" }}>
              <div className="upload-icon">📤</div>
              <span style={{ fontSize: "14px", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                {uploading ? "업로드 중..." : "서류 파일 선택 (클릭)"}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                PDF, JPG, PNG 파일 지원 (최대 10MB)
              </span>
              <input
                type="file"
                id="file-upload-input"
                style={{ display: "none" }}
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Uploaded Documents List */}
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>보관 중인 구비 서류</h2>
          {documents.length > 0 ? (
            <div className="table-container" style={{ padding: "12px" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>서류명 (유형)</th>
                    <th>등록일</th>
                    <th>동작</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ fontWeight: "700", fontSize: "14px" }}>{doc.document_type}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px", whiteSpace: "nowrap" }}>
                          {doc.file_name}
                        </div>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ display: "flex", gap: "10px" }}>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-text"
                          style={{ color: "var(--brand-green)", fontSize: "12px" }}
                        >
                          열기
                        </a>
                        <button
                          className="btn-text"
                          style={{ color: "var(--text-negative)", fontSize: "12px" }}
                          onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
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
            <div className="checklist-container" style={{ textAlign: "center", padding: "40px" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: 0 }}>보관된 증빙 서류가 없습니다. 왼쪽에서 파일을 업로드해 보세요.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
