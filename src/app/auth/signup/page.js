'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Sign up user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        console.log("[Auth] 회원가입 성공:", data.user.email);
        
        // 2. Create an empty/default profile for the user
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: data.user.id,
              birth_date: null,
              location: "",
              employment_status: "",
              income_level: ""
            }
          ]);

        if (profileError) {
          console.warn("[Auth] 프로필 초기 생성 오류:", profileError.message);
          // Don't throw, since user is signed up and can create/update it on /profile
        }

        setSuccessMsg("회원가입이 완료되었습니다! 3초 후 프로필 설정 화면으로 이동합니다.");
        
        setTimeout(() => {
          router.push("/profile");
        }, 3000);
      }
    } catch (err) {
      setErrorMsg(err.message || "회원가입에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 180px)" }}>
      <div className="form-box">
        <h2 style={{ textAlign: "center", marginBottom: "32px", fontSize: "28px" }}>회원가입</h2>

        {errorMsg && (
          <div style={{ backgroundColor: "rgba(243, 114, 127, 0.1)", color: "#f3727f", padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: "rgba(30, 215, 96, 0.1)", color: "#1ed760", padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px" }}>
            🎉 {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">이메일 주소</label>
            <input
              type="email"
              id="signup-email"
              className="form-input"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">비밀번호</label>
            <input
              type="password"
              id="signup-password"
              className="form-input"
              placeholder="비밀번호(6자 이상)를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            id="btn-signup-submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "12px" }}
            disabled={loading || successMsg !== ""}
          >
            {loading ? "가입 진행 중..." : "회원가입 완료"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "32px", fontSize: "14px", color: "var(--text-secondary)", marginBottom: 0 }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" style={{ color: "#ffffff", textDecoration: "underline", fontWeight: "700" }}>
            로그인하기
          </Link>
        </p>
      </div>
    </div>
  );
}
