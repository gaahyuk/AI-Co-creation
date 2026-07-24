import Link from "next/link";
import { IncomeCalculator } from "./income-calculator";

// 소득 기반 정책 계산기 (이윤호 브랜치 /calculator 이식 — 계산은 전부 클라이언트에서)
export default function CalculatorPage() {
  return (
    <>
      <div className="header">
        <Link href="/menu" style={{ color: "var(--text-sub)", fontSize: 14 }}>
          ‹ 전체 메뉴
        </Link>
        <h1 style={{ marginTop: 8 }}>소득 기반 정책 계산기</h1>
        <div className="sub">내 소득으로 받을 수 있는 정책을 한번에 확인하세요</div>
      </div>

      <div className="section">
        <IncomeCalculator />
      </div>
    </>
  );
}
