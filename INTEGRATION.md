# 청년정책 미니앱 통합 가이드 (INTEGRATION.md)

이 저장소는 **배가혁 베이스(브랜치 `배가혁-청년정책`)** 위에
**장재영 브랜치(JS + Supabase)** 와 **이윤호 브랜치(TS + Prisma + Supabase)** 의
기능들을 포팅해 합친 통합본입니다.

- 스택: Next.js 16 + React 19 + TypeScript, 토스 스타일 모바일 미니앱 (max-width 480px)
- **인증/DB 없음.** 개인 데이터는 전부 `localStorage`, 정책 데이터는 온통청년 API 프록시.
- 참조 브랜치의 Supabase/Prisma/서버액션 코드는 복사하지 않고
  `localStorage + 정적 시드 데이터(src/lib/*) + 클라이언트 로직`으로 포팅.

## 아키텍처 규칙 요약

- 정책 목록: `GET /api/policies` — 프로필 쿼리 기반 필터/페이지네이션
- 정책 상세: `GET /api/policies/[plcyNo]` — `PolicyWithEligibility` 반환
- 타입: `src/lib/youth/types.ts` 의 `Policy` / `PolicyWithEligibility` / `UserProfile`
- Next.js 16: 동적 라우트 `params` 는 **Promise** (`use(params)` 패턴, `src/app/policy/[plcyNo]/page.tsx` 참고)
- `localStorage` 접근은 `"use client"` 컴포넌트에서 `typeof window` 가드와 함께 (SSR 접근 금지)
- 새 npm 의존성 추가 금지. 차트는 순수 SVG/CSS.
- 페이지 전용 스타일은 해당 라우트 폴더의 CSS Module(`*.module.css`). `globals.css` 는 공용 인프라 전용.

## 라우트 맵

| 라우트 | 기능 | 출처 |
| --- | --- | --- |
| `/` | 홈 — 맞춤 정책 목록, 예상 수령액 카드, 마감임박 | 베이스(배가혁) |
| `/onboarding` | 프로필 온보딩 (하단 탭바 숨김) | 베이스(배가혁) |
| `/policy/[plcyNo]` | 정책 상세 + 자격 체크 + 서류 체크리스트 | 베이스(배가혁) |
| `/saved` | 저장(북마크)한 정책 | 베이스(배가혁) |
| `/search` | 정책 검색 | 통합 기능 |
| `/dashboard` | 대시보드 (수령/신청 현황 요약) | 통합 기능 |
| `/wallet` | 정책 지갑 — 신청/수령 기록 | 통합 기능 |
| `/menu` | 전체 기능 허브 | 공용 인프라 |
| `/diagnosis` | 자가진단 | 통합 기능 |
| `/calculator` | 소득 계산기 | 통합 기능 |
| `/asset-formation` | 자산형성 시뮬레이터 | 통합 기능 |
| `/documents` | 서류함 | 통합 기능 |
| `/news` | 정책 뉴스 | 통합 기능 |
| `/timelines` | 정책 캘린더 | 통합 기능 |
| `/recommendations` | 맞춤 추천 | 통합 기능 |
| `/compare` | 정책 비교 | 통합 기능 |
| `/profile` | 프로필 / 로컬 계정 | 통합 기능 |
| `/admin` | 관리자 (뉴스 등록 등) | 통합 기능 |

하단 탭바(`src/components/BottomNav.tsx`)의 5개 탭:
**홈(/) · 검색(/search) · 대시보드(/dashboard) · 지갑(/wallet) · 전체(/menu)** — `/onboarding` 에서는 숨김.

## localStorage 키 계약 (모든 기능 공통 — 정확히 준수)

| 키 | 내용 |
| --- | --- |
| `youth.profile` | 사용자 프로필 (`src/lib/storage.ts`) |
| `youth.bookmarks` | 북마크한 정책 ID 배열 (`src/lib/storage.ts`) |
| `youth.docs.<plcyNo>` | 정책별 서류 체크 상태 (`src/lib/storage.ts`) |
| `youth.account` | 로컬 계정 `{name, email, createdAt}` |
| `youth.diagnosis` | 자가진단 결과 |
| `youth.wallet` | 신청/수령 기록 배열 `[{policyId, policyName, status: "interested"\|"applied"\|"received", amount, date}]` |
| `youth.rewards` | `{points, history: [{reason, points, date}]}` |
| `youth.reviews.<plcyNo>` | 정책별 후기 배열 |
| `youth.qna.<plcyNo>` | 정책별 QnA 배열 |
| `youth.stories.<plcyNo>` | 정책별 성공사례 배열 |
| `youth.newsletter` | `{email, subscribed}` |
| `youth.news.custom` | 관리자 추가 뉴스 배열 `[{id, title, summary, url, date}]` |
| `youth.compare` | 비교 선택된 정책 ID 배열 |

## 공용 인프라 (이 문서 소유 에이전트가 제공)

- `src/components/BottomNav.tsx` — 하단 고정 탭바
- `src/app/layout.tsx` — `.app` 내부에 `<BottomNav />` 포함
- `src/app/menu/page.tsx` — 전체 기능 허브
- `src/app/globals.css` 하단 append 공용 클래스:
  - 탭바: `.bottom-nav` `.bottom-nav-item(.active)` `.bottom-nav-icon` `.bottom-nav-label`
  - 레이아웃: `.section-title` `.grid-2` `.menu-grid` `.menu-item` `.divider`
  - 리스트: `.list-row`(`.row-icon` `.row-title` `.row-sub` `.row-arrow`) `.stat-row`(`.stat-label` `.stat-value(.blue)`)
  - 버튼: `.btn.small` `.btn.danger` `.btn.outline` (기존 `.btn` `.btn.secondary` 와 조합)
  - 폼: `.field textarea` `.field .hint` (기존 `.field` 확장)
  - 배지/안내: `.tag(.blue/.green/.red)` `.notice(.blue)`
- 참고: `.bottombar`(정책 상세 신청 바)는 탭바 위로 올라가도록 append 규칙으로 조정됨.
  고정 하단 바가 필요한 페이지는 `.bottombar` 를 재사용하면 자동으로 탭바 위에 위치.
