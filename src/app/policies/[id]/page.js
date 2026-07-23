'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { diagnosePolicy } from "@/lib/diagnosis";

export default function PolicyDetail({ params }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reviews & Comments Feature State
  const [reviews, setReviews] = useState([]);
  const [newReviewContent, setNewReviewContent] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [storageMode, setStorageMode] = useState("supabase"); // "supabase" or "local"
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const fetchReviews = async (policyId) => {
    setReviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from("policy_reviews")
        .select("*")
        .eq("policy_id", policyId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReviews(data || []);
      setStorageMode("supabase");
    } catch (err) {
      console.warn("[Reviews] Failed to fetch from Supabase, falling back to localStorage:", err.message);
      setStorageMode("local");
      const localData = localStorage.getItem(`policy_reviews_${policyId}`);
      if (localData) {
        setReviews(JSON.parse(localData));
      } else {
        setReviews([]);
      }
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    const fetchPolicyData = async () => {
      // Next.js 15/16 Breaking Change: params is a Promise. We must await it.
      const resolvedParams = await params;
      const id = resolvedParams.id;

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

        // 4. Fetch Reviews
        await fetchReviews(id);

      } catch (err) {
        console.error("[Policy Detail Error]:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicyData();
  }, [params, router]);

  const saveReviewLocally = (updated) => {
    setStorageMode("local");
    setReviews(updated);
    if (policy) {
      localStorage.setItem(`policy_reviews_${policy.id}`, JSON.stringify(updated));
    }
  };

  const handleAddReview = async (content, parentId = null) => {
    if (!content.trim() || !user || !policy) return;

    const newReviewItem = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      policy_id: policy.id,
      user_id: user.id,
      user_email: user.email || "tester@policyflow.ai",
      content: content.trim(),
      parent_id: parentId,
      likes_count: 0,
      liked_users: [],
      created_at: new Date().toISOString()
    };

    if (storageMode === "supabase") {
      try {
        const { data, error } = await supabase
          .from("policy_reviews")
          .insert({
            policy_id: newReviewItem.policy_id,
            user_id: newReviewItem.user_id,
            user_email: newReviewItem.user_email,
            content: newReviewItem.content,
            parent_id: newReviewItem.parent_id,
            likes_count: 0,
            liked_users: []
          })
          .select()
          .single();

        if (error) throw error;
        setReviews((prev) => [...prev, data]);
      } catch (err) {
        console.warn("[Reviews] Supabase save failed, saving locally:", err.message);
        saveReviewLocally([...reviews, newReviewItem]);
      }
    } else {
      saveReviewLocally([...reviews, newReviewItem]);
    }

    if (parentId) {
      setReplyingToId(null);
      setReplyContent("");
    } else {
      setNewReviewContent("");
    }
  };

  const handleToggleLike = async (reviewId) => {
    if (!user || !policy) return;

    const userIdentifier = user.email || user.id;
    const updatedReviews = reviews.map((r) => {
      if (r.id === reviewId) {
        const likedUsers = Array.isArray(r.liked_users) ? r.liked_users : [];
        const isLiked = likedUsers.includes(userIdentifier);
        const nextLikedUsers = isLiked
          ? likedUsers.filter((u) => u !== userIdentifier)
          : [...likedUsers, userIdentifier];
        return {
          ...r,
          liked_users: nextLikedUsers,
          likes_count: nextLikedUsers.length
        };
      }
      return r;
    });

    const targetReview = updatedReviews.find((r) => r.id === reviewId);
    if (!targetReview) return;

    setReviews(updatedReviews);

    if (storageMode === "supabase") {
      try {
        const { error } = await supabase
          .from("policy_reviews")
          .update({
            liked_users: targetReview.liked_users,
            likes_count: targetReview.likes_count
          })
          .eq("id", reviewId);

        if (error) throw error;
      } catch (err) {
        console.warn("[Reviews] Supabase like update failed, updating locally:", err.message);
        saveReviewLocally(updatedReviews);
      }
    } else {
      saveReviewLocally(updatedReviews);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("이 후기(및 답글)를 삭제하시겠습니까?")) return;

    // Delete review and all child replies
    const updatedReviews = reviews.filter((r) => r.id !== reviewId && r.parent_id !== reviewId);
    setReviews(updatedReviews);

    if (storageMode === "supabase") {
      try {
        const { error } = await supabase
          .from("policy_reviews")
          .delete()
          .eq("id", reviewId);

        if (error) throw error;
      } catch (err) {
        console.warn("[Reviews] Supabase delete failed, deleting locally:", err.message);
        saveReviewLocally(updatedReviews);
      }
    } else {
      saveReviewLocally(updatedReviews);
    }
  };

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

  const getActualReferenceUrl = (p) => {
    if (!p) return "";
    
    // 온통청년 2025.07 사이트 개편으로 구 youngPlcyUnif URL이 전부 무효화됨.
    // DB에 저장된 reference_url을 직접 사용하되, 온통청년 메인 도메인만 있는 경우 통합검색으로 연결.
    if (p.reference_url) {
      const isGenericYouthCenter = /^(https?:\/\/)?(www\.)?youthcenter\.go\.kr\/?$/.test(p.reference_url.trim());
      if (isGenericYouthCenter) {
        return "https://www.youthcenter.go.kr/youthPolicy/ythPlcyTotalSearch";
      }
      return p.reference_url;
    }

    return "";
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
      <section style={{ display: "flex", gap: "16px", marginTop: "32px", flexWrap: "wrap" }}>
        <button
          id="btn-detail-wallet-toggle"
          className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
          style={{ flex: 1, minWidth: "180px" }}
          onClick={handleWalletToggle}
          disabled={actionLoading}
        >
          {isSaved ? "지갑에서 해제" : "내 지갑에 저장하기"}
        </button>

        {getActualReferenceUrl(policy) && (
          <a
            href={getActualReferenceUrl(policy)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ 
              flex: 1, 
              textAlign: "center", 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center", 
              gap: "8px", 
              backgroundColor: "rgba(30, 215, 96, 0.12)", 
              border: "1px solid var(--brand-green)", 
              color: "var(--brand-green)", 
              fontWeight: "800",
              minWidth: "180px"
            }}
          >
            🏛️ 공식 신청 사이트 바로가기 ↗
          </a>
        )}

        {diagnosis.isEligible && isSaved && (
          <Link href="/wallet" className="btn btn-primary" style={{ flex: 1, textAlign: "center", backgroundColor: "var(--text-announcement)", color: "#ffffff", minWidth: "180px" }} id="btn-detail-prepare-docs">
            서류 준비하러 가기
          </Link>
        )}
      </section>

      {/* Policy Experience & Reviews Section */}
      <section style={{ marginTop: "60px", paddingTop: "40px", borderTop: "1px solid var(--separator)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "22px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            💬 정책 수혜 체험 & 기대평 한마디
          </h2>
          {storageMode === "local" && (
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-warning)", padding: "2px 8px", backgroundColor: "rgba(255, 164, 43, 0.1)", borderRadius: "4px" }}>
              ⚡ 로컬 브라우저 저장 모드
            </span>
          )}
        </div>

        {/* Input box */}
        <div style={{ backgroundColor: "var(--bg-surface)", padding: "20px", borderRadius: "8px", marginBottom: "32px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <label style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-base)", marginBottom: "8px", display: "block" }}>후기 작성</label>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <textarea
              style={{
                flex: 1,
                backgroundColor: "var(--bg-mid)",
                color: "#ffffff",
                border: "1px solid var(--border-gray)",
                borderRadius: "6px",
                padding: "12px",
                fontSize: "14px",
                fontFamily: "var(--font-family)",
                minHeight: "80px",
                resize: "vertical",
                outline: "none"
              }}
              placeholder="이 정책에 대한 수혜 후기나 기대평을 자유롭게 나누어 보세요!"
              value={newReviewContent}
              onChange={(e) => setNewReviewContent(e.target.value)}
            />
            <button
              className="btn btn-primary"
              style={{ padding: "12px 24px", height: "fit-content", textTransform: "none", letterSpacing: "normal" }}
              onClick={() => handleAddReview(newReviewContent)}
            >
              등록
            </button>
          </div>
        </div>

        {/* Review list */}
        {reviewsLoading ? (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>후기를 불러오는 중...</p>
        ) : reviews.filter(r => !r.parent_id).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed var(--border-gray)" }}>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>아직 등록된 후기가 없습니다. 첫 번째 후기를 작성해 보세요!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {reviews
              .filter((r) => !r.parent_id)
              .map((mainReview) => {
                const mainReplies = reviews.filter((r) => r.parent_id === mainReview.id);
                const userIdentifier = user?.email || user?.id;
                const isLiked = Array.isArray(mainReview.liked_users) && mainReview.liked_users.includes(userIdentifier);
                const isOwnReview = user && mainReview.user_id === user.id;

                return (
                  <div key={mainReview.id} style={{ display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "var(--bg-surface)", padding: "20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
                          {mainReview.user_email}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                          {new Date(mainReview.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {isOwnReview && (
                        <button
                          style={{ background: "none", border: "none", color: "var(--text-negative)", fontSize: "12px", cursor: "pointer", fontWeight: "700" }}
                          onClick={() => handleDeleteReview(mainReview.id)}
                        >
                          삭제
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p style={{ margin: 0, fontSize: "14px", color: "#ffffff", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                      {mainReview.content}
                    </p>

                    {/* Footer Actions */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "8px" }}>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: isLiked ? "var(--brand-green)" : "var(--text-secondary)",
                          fontSize: "13px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onClick={() => handleToggleLike(mainReview.id)}
                      >
                        👍 {mainReview.likes_count || 0}
                      </button>
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          color: replyingToId === mainReview.id ? "#ffffff" : "var(--text-secondary)",
                          fontSize: "13px",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          setReplyingToId(replyingToId === mainReview.id ? null : mainReview.id);
                          setReplyContent("");
                        }}
                      >
                        💬 답글 달기
                      </button>
                    </div>

                    {/* Reply Input Form */}
                    {replyingToId === mainReview.id && (
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", paddingLeft: "16px", borderLeft: "2px solid var(--border-gray)" }}>
                        <input
                          type="text"
                          style={{
                            flex: 1,
                            backgroundColor: "var(--bg-mid)",
                            color: "#ffffff",
                            border: "1px solid var(--border-gray)",
                            borderRadius: "6px",
                            padding: "8px 12px",
                            fontSize: "13px",
                            outline: "none"
                          }}
                          placeholder="답글을 남겨주세요..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                        />
                        <button
                          className="btn btn-primary"
                          style={{ padding: "8px 16px", fontSize: "12px", textTransform: "none", letterSpacing: "normal", borderRadius: "6px" }}
                          onClick={() => handleAddReview(replyContent, mainReview.id)}
                        >
                          등록
                        </button>
                      </div>
                    )}

                    {/* Nested Replies */}
                    {mainReplies.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px", paddingLeft: "20px", borderLeft: "2px solid var(--separator)" }}>
                        {mainReplies.map((reply) => {
                          const isReplyLiked = Array.isArray(reply.liked_users) && reply.liked_users.includes(userIdentifier);
                          const isOwnReply = user && reply.user_id === user.id;

                          return (
                            <div key={reply.id} style={{ display: "flex", flexDirection: "column", gap: "6px", backgroundColor: "rgba(255,255,255,0.02)", padding: "12px 16px", borderRadius: "6px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>
                                    {reply.user_email}
                                  </span>
                                  <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                                    {new Date(reply.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                {isOwnReply && (
                                  <button
                                    style={{ background: "none", border: "none", color: "var(--text-negative)", fontSize: "11px", cursor: "pointer", fontWeight: "700" }}
                                    onClick={() => handleDeleteReview(reply.id)}
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-near-white)", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                                {reply.content}
                              </p>
                              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px" }}>
                                <button
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: isReplyLiked ? "var(--brand-green)" : "var(--text-secondary)",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}
                                  onClick={() => handleToggleLike(reply.id)}
                                >
                                  👍 {reply.likes_count || 0}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
