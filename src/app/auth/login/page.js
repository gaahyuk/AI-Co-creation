'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log("[Auth] 로그인 성공:", data.user.email);
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err.message || "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(`${provider} 로그인을 시작할 수 없습니다: ${err.message}`);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 180px)" }}>
      <div className="form-box">
        <h2 style={{ textAlign: "center", marginBottom: "32px", fontSize: "28px" }}>로그인</h2>

        {errorMsg && (
          <div style={{ backgroundColor: "rgba(243, 114, 127, 0.1)", color: "#f3727f", padding: "12px", borderRadius: "4px", marginBottom: "20px", fontSize: "14px" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleEmailLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">이메일 주소</label>
            <input
              type="email"
              id="email-input"
              className="form-input"
              placeholder="이메일을 입력하세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password-input">비밀번호</label>
            <input
              type="password"
              id="password-input"
              className="form-input"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            id="btn-login-submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "12px" }}
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div style={{ margin: "24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <span style={{ height: "1px", backgroundColor: "var(--separator)", flex: 1 }}></span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase" }}>또는</span>
          <span style={{ height: "1px", backgroundColor: "var(--separator)", flex: 1 }}></span>
        </div>

        {/* Social Logins */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            id="btn-login-google"
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "center", gap: "10px" }}
            onClick={() => handleSocialLogin("google")}
          >
            Google 계정으로 로그인
          </button>
          <button
            id="btn-login-kakao"
            className="btn btn-secondary"
            style={{ width: "100%", justifyContent: "center", gap: "10px", backgroundColor: "#FEE500", color: "#191919", borderColor: "#FEE500" }}
            onClick={() => handleSocialLogin("kakao")}
          >
            Kakao 계정으로 로그인
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "32px", fontSize: "14px", color: "var(--text-secondary)", marginBottom: 0 }}>
          PolicyFlow AI가 처음이신가요?{" "}
          <Link href="/auth/signup" style={{ color: "#ffffff", textDecoration: "underline", fontWeight: "700" }}>
            가입하기
          </Link>
        </p>
      </div>
    </div>
  );
}
