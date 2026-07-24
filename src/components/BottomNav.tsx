"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 하단 고정 탭바 — 온보딩에서는 숨김
const TABS = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/search", label: "검색", icon: "🔍" },
  { href: "/dashboard", label: "대시보드", icon: "📊" },
  { href: "/wallet", label: "지갑", icon: "💳" },
  { href: "/menu", label: "전체", icon: "☰" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  // 온보딩 화면에서는 탭바를 노출하지 않음
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return null;
  }

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`bottom-nav-item ${isActive(tab.href) ? "active" : ""}`}
          aria-current={isActive(tab.href) ? "page" : undefined}
        >
          <span className="bottom-nav-icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
