import Link from "next/link";

// 전체 기능 허브 — 각 기능 페이지는 다른 에이전트가 담당 (링크만 정확히 유지)
const FEATURE_GROUPS: {
  title: string;
  items: { href: string; icon: string; label: string }[];
}[] = [
  {
    title: "진단 · 계산",
    items: [
      { href: "/onboarding/demo", icon: "✨", label: "1초 체험 로그인" },
      { href: "/diagnosis", icon: "🩺", label: "자가진단" },
      { href: "/calculator", icon: "🧮", label: "소득 계산기" },
      { href: "/asset-formation", icon: "📈", label: "자산형성 시뮬레이터" },
    ],
  },
  {
    title: "정책 찾기",
    items: [
      { href: "/recommendations", icon: "🎯", label: "맞춤 추천" },
      { href: "/compare", icon: "⚖️", label: "정책 비교" },
      { href: "/timelines", icon: "🗓️", label: "정책 캘린더" },
      { href: "/news", icon: "📰", label: "정책 뉴스" },
    ],
  },
  {
    title: "내 관리",
    items: [
      { href: "/saved", icon: "⭐", label: "저장한 정책" },
      { href: "/documents", icon: "📂", label: "서류함" },
      { href: "/profile", icon: "👤", label: "프로필" },
      { href: "/admin", icon: "🛠️", label: "관리자" },
    ],
  },
];

export default function MenuPage() {
  return (
    <>
      <div className="header">
        <h1>전체</h1>
        <div className="sub">청년정책 미니앱의 모든 기능을 모았어요</div>
      </div>

      <div className="section">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="section-title">{group.title}</div>
            <div className="menu-grid">
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="menu-item">
                  <span className="menu-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="menu-label">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="notice" style={{ marginTop: 20 }}>
          이 앱의 모든 개인 데이터는 브라우저(localStorage)에만 저장돼요. 서버에
          별도로 보관하지 않아요.
        </div>
      </div>
    </>
  );
}
