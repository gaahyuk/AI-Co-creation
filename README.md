# 청년정책 올인원 미니앱 (AI-Co-creation 통합본)

청년이 **본인 정보로 신청 가능한 청년 정책을 맞춤 추천받고, 진단→비교→서류 준비→신청→수령 관리까지** 한 곳에서 끝내는 토스 스타일 모바일 미니앱.

이 저장소는 [gaahyuk/AI-Co-creation](https://github.com/gaahyuk/AI-Co-creation)의 세 브랜치에서 각자 개발된 프로그램을 하나로 통합한 결과물입니다.

| 브랜치 | 원본 스택 | 이 통합본에 가져온 것 |
|---|---|---|
| `배가혁-청년정책` (**베이스**) | Next.js 16 + React 19 + TS, localStorage | 앱 뼈대 전체 — 온보딩, 홈(맞춤 목록·머니카드), 정책 상세(자격판정·서류체크), 저장함, 온통청년 API BFF |
| `장재영` | Next.js(JS) + Supabase | 자가진단, 정책 지갑, 대시보드, 정책 후기, 관리자, 로컬 계정(로그인/가입 대체), 1초 데모 로그인 |
| `이윤호` | Next.js(TS) + Prisma + Supabase | 소득 계산기, 자산형성 시뮬레이터, 서류함(자동분류+발급가이드), 정책 뉴스+뉴스레터, 정책 캘린더, 매칭엔진 맞춤 추천, 통합 검색, 정책 비교, QnA·성공사례·신청팁·공유, 마감 알림, 리워드 |

> 데이터 출처: **온통청년 청년정책 OpenAPI** (공공데이터포털 15143273, 약 2,600건)

---

## 통합 원칙

원본 두 브랜치는 Supabase/Prisma 등 외부 DB·인증에 의존했지만, 베이스 앱은 **서버 상태가 없는 미니앱**입니다. 따라서 모든 기능을 다음 원칙으로 **포팅**했습니다 (코드 복사가 아닌 재구현):

- **인증/DB 제거** → 개인 데이터는 전부 `localStorage` (키 계약은 아래 표)
- **Prisma 시드 데이터** → `src/lib/*-data.ts` 정적 TS 데이터로 이식
- **서버 액션/DB API 라우트** → 클라이언트 로직으로 이관 (정책 데이터만 기존 BFF `/api/policies` 프록시 사용)
- **외부 연동(OCR·알림톡·크론)** → 파일명 기반 mock / 클라이언트 계산으로 대체
- **새 npm 의존성 0개** — 차트·캘린더는 순수 CSS/SVG
- 로그인/회원가입 → **로컬 계정**(`youth.account`)으로 취지 유지

상세 규칙과 에이전트용 계약 문서는 [INTEGRATION.md](./INTEGRATION.md) 참고.

---

## 전체 기능 & 라우트 맵

하단 탭바 5개: **홈(/) · 검색(/search) · 대시보드(/dashboard) · 지갑(/wallet) · 전체(/menu)**

### 정책 찾기
| 라우트 | 기능 | 출처 |
|---|---|---|
| `/` | 홈 — 프로필 기반 맞춤 목록, "받을 수 있는 돈" 합산 카드, 마감임박 섹션, 카테고리 탭 | 배가혁 |
| `/search` | 통합 검색 — 키워드 + 카테고리/지역 필터, 최근 검색어 | 이윤호 |
| `/recommendations` | 매칭엔진 맞춤 추천 — 프로필+진단 결과 기반 스코어링·추천 사유 표시 | 이윤호 |
| `/compare` | 정책 비교 — 북마크 중 2~3개 선택, 자격·금액·조건·마감 나란히 비교 | 이윤호 |
| `/timelines` | 정책 캘린더 — 월별 신청 시즌, 학사일정 연계, 북마크 마감일 달력 표시 | 이윤호 |
| `/news` | 정책 뉴스 + 뉴스레터 구독 (카테고리 필터, 관리자 등록 뉴스 병합) | 이윤호 |

### 진단·계산
| 라우트 | 기능 | 출처 |
|---|---|---|
| `/diagnosis` | 자가진단 — 5단계 위저드, 4축(나이/지역/직업/소득) 적합도 점수, 맞춤 유형 진단, 프로필 반영 | 장재영 |
| `/calculator` | 소득 계산기 — 중위소득 % 판정, 소득 조건 매칭 | 이윤호 |
| `/asset-formation` | 자산형성 시뮬레이터 — 청년도약계좌·희망적금 등 만기 수령액 시뮬레이션 | 이윤호 |

### 정책 상세 (`/policy/[plcyNo]`)
- **자격 확인 체크리스트** (연령·거주지·소득·취업상태 자동 판정) + 예상 지원금 — 배가혁
- **서류 준비 체크리스트** (진행률 저장) — 배가혁
- **커뮤니티 탭**: 후기(별점·좋아요·답글 / 장재영), QnA, 성공사례(평균 수령액·기간 통계), 실시간 신청팁 제보, 공유(Web Share) — 이윤호

### 내 관리
| 라우트 | 기능 | 출처 |
|---|---|---|
| `/dashboard` | 대시보드 — 프로필 요약, 마감임박 알림(D-14/D-3), 신청 현황, 진단 요약, 서류 진행률 | 장재영+이윤호 |
| `/wallet` | 정책 지갑 — 신청/수령 기록 관리, 수령액 합산, 리워드 포인트·배지·레벨 | 장재영+이윤호 |
| `/documents` | 서류함 — 서류 등록(메타데이터), 파일명 기반 자동 분류(mock OCR), 발급처/수수료/처리기간 가이드, 정책 체크리스트 연동 | 이윤호 |
| `/saved` | 저장함 — 마감순 정렬, 서류 준비율 | 배가혁 |
| `/profile` | 프로필 수정 + 로컬 계정 + 활동 요약 + 뉴스레터 상태 | 장재영+이윤호 |
| `/admin` | 관리자 — 데이터 현황, 뉴스 등록, 로컬 데이터(키별) 관리, 정책 새로고침 | 장재영+이윤호 |
| `/onboarding` | 4문답 온보딩 + 진단 리포트 | 배가혁 |
| `/onboarding/demo` | **1초 데모 로그인** — 클릭 한 번으로 가상 프로필·진단·계정 세팅 후 대시보드 진입 | 장재영 |

---

## 아키텍처

```
[모바일 WebView / 브라우저]
   └ Next.js 16 (App Router) + React 19 + TypeScript
        │  개인 데이터: localStorage (youth.* 키 계약)
        ↕ HTTPS
[BFF — Next.js API Routes]  ← YOUTH_API_KEY 보호, 응답 1시간 캐싱
        ↕
  온통청년 OpenAPI (getPlcy)
```

- 정책 목록: `GET /api/policies` (프로필 쿼리 필터/페이지네이션)
- 정책 상세: `GET /api/policies/[plcyNo]` → `PolicyWithEligibility` (자격판정 포함)
- 그 외 모든 기능은 **클라이언트 전용** — 서버 상태 없음

### localStorage 키 계약

| 키 | 내용 |
|---|---|
| `youth.profile` | 사용자 프로필 |
| `youth.bookmarks` | 북마크한 정책 ID 배열 |
| `youth.docs.<plcyNo>` | 정책별 서류 체크 상태 |
| `youth.account` | 로컬 계정 `{name, email, createdAt}` |
| `youth.diagnosis` | 자가진단 결과 |
| `youth.wallet` | 신청/수령 기록 `[{policyId, policyName, status, amount, date}]` |
| `youth.rewards` | `{points, history}` — 배지·레벨 |
| `youth.reviews/qna/stories/tips.<plcyNo>` | 정책별 커뮤니티 데이터 |
| `youth.documents` | 서류함 메타데이터 |
| `youth.newsletter` / `youth.news.custom` | 뉴스레터 구독 / 관리자 뉴스 |
| `youth.compare` | 비교 선택 정책 ID |

### 주요 폴더

```
src/
├── app/
│   ├── page.tsx                     홈
│   ├── onboarding/  (+demo/)        온보딩 · 1초 데모 로그인
│   ├── policy/[plcyNo]/             상세 + 커뮤니티(후기·QnA·사례·팁·공유)
│   ├── search/ recommendations/ compare/ timelines/ news/
│   ├── diagnosis/ calculator/ asset-formation/
│   ├── dashboard/ wallet/ documents/ saved/ profile/ admin/ menu/
│   └── api/policies/                BFF (온통청년 프록시 + 자격판정)
├── components/BottomNav.tsx         하단 탭바
└── lib/
    ├── youth/                       API 클라이언트·자격판정·금액파싱·타입
    ├── matching-engine.ts(.test)    추천 스코어링
    ├── diagnosis.ts calculator.ts(.test) wallet.ts documents.ts compare.ts account.ts
    ├── *-data.ts                    정적 시드 (자산형성 상품·서류 가이드·뉴스·타임라인)
    └── storage.ts regions.ts format.ts
```

---

## 실행 방법

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # vitest — 72개 테스트
npm run build   # 프로덕션 빌드 (21개 라우트)
```

`.env.local`에 온통청년 API 키가 필요합니다 ([youthcenter.go.kr](https://www.youthcenter.go.kr) 마이페이지에서 발급):

```
YOUTH_API_KEY=발급받은-키
```

처음 써본다면: `npm run dev` → `/onboarding/demo` 에서 **1초 데모 로그인**으로 전체 기능을 바로 둘러볼 수 있습니다.

---

## 품질 검증

이 통합본은 멀티에이전트 파이프라인(구현 12 + 빌드 2 + 검증 4 + 수정 3, 총 21개 에이전트)으로 제작·검증되었습니다:

- `tsc --noEmit` 에러 0건
- **vitest 72개 테스트 전부 통과** — 금액파싱 10 · 자격판정 16 · 계산기 19 · 매칭엔진 27
- Next.js 프로덕션 빌드 21개 라우트 성공
- 완전성 검증: 장재영/이윤호 브랜치의 기능 목록을 원본 소스와 전수 대조
- 코드 리뷰: SSR-localStorage 접근, Next 16 params Promise, 키 계약 불일치 등 점검 → 발견된 결함(대시보드 진단 스키마 불일치, 리워드 배지 미연결 등) 수정 완료

## 알려진 한계

- **소득 정밀 매칭 미반영**: API 소득 기준 단위(연소득/중위소득)가 정책마다 달라 안내만 제공
- **지원금은 추정치**: 지원내용 텍스트 파싱 기반
- **서류함은 메타데이터만 저장**: 실제 파일은 localStorage에 저장하지 않음 (UI에 명시)
- **뉴스레터/알림은 로컬 기록**: 실제 발송 인프라 없음 (원본의 알림톡·이메일은 mock 대체)
- 데이터가 브라우저 localStorage에 있으므로 **기기 간 동기화 없음**
