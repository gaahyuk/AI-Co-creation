'use client';

import { Inter } from "next/font/google";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [upcomingDeadline, setUpcomingDeadline] = useState(null);

  useEffect(() => {
    const checkAdmin = async (userId) => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", userId)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        setIsAdmin(!!data?.is_admin);
      } catch (err) {
        console.error("[Layout Admin Check Error]:", err.message);
        setIsAdmin(false);
      }
    };

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkAdmin(currentUser.id);
      } else {
        setIsAdmin(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkAdmin(currentUser.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUpcomingDeadline(null);
      return;
    }

    // Fetch user's saved policies to display a mock deadline guardian alert on the bottom bar
    const fetchDeadlines = async () => {
      try {
        const { data: apps, error } = await supabase
          .from("applications")
          .select("status, policies(*)")
          .eq("user_id", user.id);

        if (error) throw error;

        // Find policy with the closest deadline that is not completed
        const pending = apps
          .filter(a => a.status !== 'completed' && a.policies?.deadline)
          .map(a => a.policies)
          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        if (pending.length > 0) {
          const closest = pending[0];
          const daysLeft = Math.ceil((new Date(closest.deadline) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0) {
            setUpcomingDeadline({
              title: closest.title,
              daysLeft: daysLeft,
              id: closest.id
            });
            console.log(`[Deadline Guardian] 알림 감지: "${closest.title}" 마감 ${daysLeft}일 전 (이메일 및 카카오 알림톡 발송 대기)`);
          }
        } else {
          setUpcomingDeadline(null);
        }
      } catch (err) {
        console.error("Error fetching deadlines for alert bar:", err);
      }
    };

    fetchDeadlines();
  }, [user, pathname]); // Re-fetch on pathname change (e.g. when saving/deleting policies)

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <html lang="ko" className={`${inter.variable}`}>
      <head>
        <title>PolicyFlow AI - AI 기반 정책 수혜 자동화 플랫폼</title>
        <meta name="description" content="정책을 검색하는 시대를 끝내고, AI가 개인에게 적합한 정책을 탐색하고 신청 준비를 지원하는 정책 수혜 자동화 플랫폼" />
      </head>
      <body>
        <div className="app-layout">
          {/* Sidebar Navigation */}
          <aside className="sidebar">
            <div className="logo-container">
              <Link href="/" className="logo">
                <span className="logo-icon">⚡</span>
                <span>PolicyFlow AI</span>
              </Link>
            </div>
            
            <nav className="nav-group">
              <Link 
                href="/" 
                id="nav-home" 
                className={`nav-link ${pathname === "/" ? "active" : ""}`}
              >
                <span className="nav-icon">🏠</span>
                <span>홈 / 랜딩</span>
              </Link>
              <Link 
                href="/dashboard" 
                id="nav-dashboard" 
                className={`nav-link ${pathname.startsWith("/dashboard") ? "active" : ""}`}
              >
                <span className="nav-icon">📊</span>
                <span>정책 추천 & 진단</span>
              </Link>
              <Link 
                href="/wallet" 
                id="nav-wallet" 
                className={`nav-link ${pathname.startsWith("/wallet") ? "active" : ""}`}
              >
                <span className="nav-icon">💼</span>
                <span>마이 월렛 & 서류</span>
              </Link>
              <Link 
                href="/profile" 
                id="nav-profile" 
                className={`nav-link ${pathname.startsWith("/profile") ? "active" : ""}`}
              >
                <span className="nav-icon">👤</span>
                <span>프로필 설정</span>
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  id="nav-admin" 
                  className={`nav-link ${pathname.startsWith("/admin") ? "active" : ""}`}
                  style={{ borderLeft: "3px solid var(--text-warning)" }}
                >
                  <span className="nav-icon">🔑</span>
                  <span style={{ color: "var(--text-warning)" }}>관리자 모드</span>
                </Link>
              )}
            </nav>
          </aside>

          {/* Main Workspace */}
          <div className="main-wrapper">
            <header className="main-header">
              {user ? (
                <div 
                  id="user-badge-btn" 
                  className="user-badge" 
                  onClick={handleLogout}
                  title="클릭하여 로그아웃"
                >
                  <span>👤</span>
                  <span>{user.email} (로그아웃)</span>
                </div>
              ) : (
                <Link href="/auth/login" id="user-badge-btn" className="user-badge">
                  <span>🔑</span>
                  <span>로그인 / 회원가입</span>
                </Link>
              )}
            </header>

            <main className="main-content">
              {children}
            </main>
          </div>

          {/* Bottom Alert Bar (Deadline Guardian) */}
          <footer className="bottom-alert-bar">
            <div className="alert-info">
              <div className="alert-icon">
                🔔
              </div>
              <div className="alert-text">
                {upcomingDeadline ? (
                  <>
                    <span className="alert-title">Deadline Guardian 알림</span>
                    <span className="alert-desc">
                      📢 <strong>{upcomingDeadline.title}</strong> 신청 마감이 <strong>{upcomingDeadline.daysLeft}일</strong> 남았습니다! 서류를 점검해 주세요.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="alert-title">일정 파수꾼 활성화됨</span>
                    <span className="alert-desc">관심 정책을 지갑에 추가하면 마감 기한 알림을 실시간으로 보내드립니다.</span>
                  </>
                )}
              </div>
            </div>
            {upcomingDeadline && (
              <button 
                id="bottom-alert-btn" 
                className="alert-action-btn"
                onClick={() => router.push(`/policies/${upcomingDeadline.id}`)}
              >
                정책 보기
              </button>
            )}
          </footer>
        </div>
      </body>
    </html>
  );
}
