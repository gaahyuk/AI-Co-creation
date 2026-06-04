'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [birthDate, setBirthDate] = useState("");
  const [location, setLocation] = useState("전국");
  const [employmentStatus, setEmploymentStatus] = useState("대학생");
  const [incomeLevel, setIncomeLevel] = useState("중위소득 100% 이하");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(session.user);
      
      // Fetch profile data
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 means no row found, which is fine (we will insert on save)
          throw error;
        }

        if (data) {
          setBirthDate(data.birth_date || "");
          setLocation(data.location || "전국");
          setEmploymentStatus(data.employment_status || "대학생");
          setIncomeLevel(data.income_level || "중위소득 100% 이하");
        }
      } catch (err) {
        console.error("[Profile Fetch Error]:", err.message);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. 기존 프로필 데이터가 실제로 존재하는지 조회
      const { data: existingProfile, error: selectError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        throw selectError;
      }

      let dbError;

      if (existingProfile) {
        // 2. 이미 프로필 행이 존재하므로 안정적인 UPDATE 수행
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            birth_date: birthDate || null,
            location,
            employment_status: employmentStatus,
            income_level: incomeLevel,
            updated_at: new Date().toISOString()
          })
          .eq("id", user.id);
        
        dbError = updateError;
      } else {
        // 3. 트리거 오류 등으로 행이 없는 경우에만 신규 INSERT 수행
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            birth_date: birthDate || null,
            location,
            employment_status: employmentStatus,
            income_level: incomeLevel,
            updated_at: new Date().toISOString()
          });

        dbError = insertError;
      }

      if (dbError) throw dbError;

      setSuccessMsg("🎉 프로필 정보가 정상적으로 업데이트되었습니다!");
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setErrorMsg("프로필 저장에 실패했습니다: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h3>프로필 정보를 로드하는 중...</h3>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 180px)" }}>
        <div className="form-box" style={{ textAlign: "center" }}>
          <h2 style={{ marginBottom: "16px" }}>접근 권한 없음</h2>
          <p style={{ marginBottom: "24px" }}>프로필을 수정하려면 먼저 로그인해 주세요.</p>
          <Link href="/auth/login" className="btn btn-primary" id="profile-login-redirect">
            로그인하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px 0" }}>
      <h1 id="profile-title">프로필 설정</h1>
      <p style={{ marginBottom: "32px" }}>
        개인 자격을 설정하시면, PolicyFlow AI가 최적의 청년 수혜 정책을 자동 판별해 줍니다.
      </p>

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

      <form onSubmit={handleProfileSave} className="checklist-container" style={{ padding: "32px" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="birth-date">생년월일</label>
          <input
            type="date"
            id="birth-date"
            className="form-input"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="location">거주지역</label>
          <select
            id="location"
            className="form-select"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="전국">전국 (지역 무관)</option>
            <option value="서울">서울특별시</option>
            <option value="인천">인천광역시</option>
            <option value="경기">경기도</option>
            <option value="부산">부산광역시</option>
            <option value="대구">대구광역시</option>
            <option value="광주">광주광역시</option>
            <option value="대전">대전광역시</option>
            <option value="울산">울산광역시</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="employment-status">직업 / 고용상태</label>
          <select
            id="employment-status"
            className="form-select"
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value)}
          >
            <option value="대학생">대학생</option>
            <option value="취업준비생">취업준비생</option>
            <option value="사회초년생">사회초년생 (재직자)</option>
            <option value="소상공인">소상공인 (창업자)</option>
            <option value="기타">기타 / 무직</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="income-level">소득구간 (기준중위소득)</label>
          <select
            id="income-level"
            className="form-select"
            value={incomeLevel}
            onChange={(e) => setIncomeLevel(e.target.value)}
          >
            <option value="중위소득 50% 이하">중위소득 50% 이하 (저소득층)</option>
            <option value="중위소득 100% 이하">중위소득 100% 이하 (평균 이하)</option>
            <option value="중위소득 120% 이하">중위소득 120% 이하</option>
            <option value="중위소득 150% 이하">중위소득 150% 이하 (중산층 이하)</option>
            <option value="중위소득 180% 이하">중위소득 180% 이하</option>
            <option value="중위소득 150% 초과 / 제한 없음">중위소득 150% 초과 / 제한 없음</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "16px", marginTop: "32px" }}>
          <button
            type="submit"
            id="btn-profile-save"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={saving}
          >
            {saving ? "저장 중..." : "설정 저장"}
          </button>
          <Link href="/dashboard" className="btn btn-secondary" style={{ flex: 1, textAlign: "center" }}>
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
