# 📋 PolicyFlow AI — 프로젝트 포트폴리오

> **AI 기반 정책 수혜 자동화 플랫폼**
>
> 정책을 검색하는 시대를 끝내고, 사용자의 조건에 맞는 정책을 자동으로 매칭하고 신청까지 지원하는 서비스

---

## 🏷️ 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | PolicyFlow AI |
| **한줄 소개** | 사용자 맞춤형 AI 정책 수혜 자동화 플랫폼 |
| **개발 기간** | 2026.05.30 ~ (진행 중) |
| **팀 구성** | — |
| **담당 역할** | — |
| **카테고리** | 공공서비스 / GovTech / AI |

---

## 🛠️ 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.2.6 | React 풀스택 프레임워크 (App Router) |
| React | 19.2.4 | UI 컴포넌트 |
| TailwindCSS | 4.x | 유틸리티 기반 스타일링 |

### Backend & Database
| 기술 | 용도 |
|------|------|
| Supabase (PostgreSQL 17) | 인증, 데이터베이스, 스토리지, RLS |
| Supabase Auth | 이메일/소셜 로그인 (Google, Kakao) |
| Supabase Storage | 사용자 서류(PDF/이미지) 보관 |

### AI / 외부 API
| 기술 | 용도 |
|------|------|
| *(계획 중)* | 정책 공고문 파싱, 자연어 Q&A |

### DevOps & Tools
| 기술 | 용도 |
|------|------|
| Supabase MCP | AI 에이전트를 통한 DB 스키마 자동화 |
| Vercel | 배포 (예정) |
| Git | 버전 관리 |

---

## 🎯 해결하려는 문제

```
사용자는 정책의 존재를 모르고, 자격 여부를 판단하기 어렵고,
신청 마감일을 놓치고, 서류 준비가 번거로워 정책 혜택을 받지 못한다.
기존 플랫폼은 정보 제공에 집중되어 있어 실제 신청 완료까지 지원하지 못한다.
```

### 타겟 사용자
- **Primary**: 청년 (19~39세) — 대학생, 취업준비생, 사회초년생
- **Secondary**: 소상공인, 경력단절여성, 농업인 (향후 확장)

---

## 📐 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│                                                     │
│  Landing ─ Auth ─ Dashboard ─ Policies ─ Wallet     │
│                  ─ Profile ─ Documents               │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase JS Client
                       ▼
┌─────────────────────────────────────────────────────┐
│                 Supabase (BaaS)                     │
│                                                     │
│  Auth  │  PostgreSQL  │  Storage  │  Edge Functions │
│        │  (RLS 적용)   │           │   (향후)        │
└─────────────────────────────────────────────────────┘
```

### 데이터베이스 스키마 (ERD)

```
┌──────────────┐     ┌──────────────┐
│   profiles   │     │   policies   │
├──────────────┤     ├──────────────┤
│ id (PK, FK)  │     │ id (PK)      │
│ birth_date   │     │ title        │
│ location     │     │ category     │
│ income_level │     │ min/max_age  │
│ employment   │     │ locations[]  │
│ _status      │     │ jobs[]       │
│ created_at   │     │ income_limit │
│ updated_at   │     │ benefit_amt  │
└──────┬───────┘     │ deadline     │
       │             │ description  │
       │             │ req_docs[]   │
       │             └──────┬───────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  documents   │     │ applications │
├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │
│ user_id (FK) │     │ user_id (FK) │
│ file_url     │     │ policy_id(FK)│
│ doc_type     │     │ status       │
│ created_at   │     │ created_at   │
└──────────────┘     │ updated_at   │
                     └──────────────┘
```

---

## ✨ 핵심 기능

### MVP (V1) — 현재 구현 범위

| # | 기능 | 설명 | 우선순위 | 상태 |
|---|------|------|----------|------|
| 1 | **Policy Diagnosis** | 사용자 조건 기반 자격 자동 판별 (나이·지역·직업·소득 4축 매칭) | P0 | ✅ 구현 완료 |
| 2 | **Policy Recommendation** | 정책별 적합도 점수(%) 산출 및 우선순위 정렬 | P0 | ✅ 구현 완료 |
| 3 | **Policy Wallet** | 관심 정책 저장, 신청 상태 추적 (미신청→준비중→신청완료→수혜완료) | P0 | ✅ 구현 완료 |
| 4 | **Document Manager** | PDF/이미지 서류 업로드, 자동 분류, 재사용 | P0 | 🔧 진행 중 |
| 5 | **Deadline Guardian** | 정책 마감일 알림 (D-7, D-3, D-1) | P0 | 📋 예정 |
| 6 | **사용자 인증** | 이메일 회원가입/로그인 (Supabase Auth) | P0 | ✅ 구현 완료 |
| 7 | **프로필 관리** | 생년월일, 거주지, 직업, 소득구간 CRUD | P0 | ✅ 구현 완료 |

### 향후 로드맵

| 버전 | 기능 | 상태 |
|------|------|------|
| V2 | AI Chat Advisor (정책 상담 챗봇) | 📋 예정 |
| V2 | AI Policy Interpreter (행정용어 번역) | 📋 예정 |
| V3 | Benefit Graph (연관 정책 추천) | 📋 예정 |
| V3 | 정책 신청 자동화 | 📋 예정 |
| V4 | 기관용 SaaS 대시보드 | 📋 예정 |

---

## 🏗️ 개발 타임라인 (Dev Log)

### 📅 2026.05.30 — Day 1: 프로젝트 초기 세팅

**완료 항목:**
- [x] Next.js 16 프로젝트 초기화 (App Router)
- [x] PRD.md 작성 (제품 요구사항 정의서)
- [x] DESIGN.md 작성 (Spotify 인스파이어 다크 테마 디자인 시스템)
- [x] Supabase 프로젝트 연동 (MCP를 통한 자동 구성)
- [x] 데이터베이스 스키마 설계 및 생성 (profiles, policies, documents, applications)
- [x] RLS(Row Level Security) 보안 정책 설정
- [x] 회원가입 시 프로필 자동 생성 트리거 설정
- [x] 정책 시드 데이터 4종 적재 (청년월세지원, 청년도약계좌, 국민취업지원제도, 인천 청년 드림체크카드)
- [x] 인증 시스템 구현 (이메일 로그인/회원가입)
- [x] 랜딩 페이지, 대시보드, 정책 상세, 프로필, Policy Wallet 페이지 구현
- [x] 정책 매칭 진단 엔진 구현 (4축 점수 계산 알고리즘)

**기술적 의사결정:**
- Supabase MCP를 활용하여 DB 스키마 자동 생성 → 수동 SQL 실행 대비 개발 시간 단축
- RLS 정책으로 클라이언트 사이드 데이터 접근 제어 → 별도 백엔드 API 서버 불필요
- 정책 매칭 로직을 클라이언트 사이드에서 처리 → 서버 부하 최소화, 실시간 UX 제공

<!--
### 📅 YYYY.MM.DD — Day N: (제목)

**완료 항목:**
- [ ] 작업 내용

**기술적 의사결정:**
- 결정 사항 및 근거

**이슈 & 해결:**
- 문제: ...
- 해결: ...
-->

---

## 📊 성과 지표 (KPI)

| 지표 | 목표 | 현재 |
|------|------|------|
| North Star: 사용자당 발견 예상 수혜금액 | 측정 예정 | — |
| 정책 매칭 소요 시간 | 5분 이내 | — |
| 정책 시드 데이터 수 | 4종 | 4종 ✅ |
| DB 테이블 수 | 4개 | 4개 ✅ |
| RLS 보안 적용률 | 100% | 100% ✅ |

---

## 🧠 배운 점 & 회고

### 기술적 학습
- **Supabase RLS**: Row Level Security를 통한 클라이언트 사이드 보안 제어 패턴 학습
- **MCP (Model Context Protocol)**: AI 에이전트를 통한 데이터베이스 자동화 워크플로 경험
- **Next.js App Router**: 서버/클라이언트 컴포넌트 분리 및 인증 흐름 설계

### 개선할 점
- *(진행하면서 업데이트 예정)*

---

## 🔗 링크

| 항목 | URL |
|------|-----|
| 배포 URL | *(배포 후 추가)* |
| GitHub | *(업로드 후 추가)* |
| 시연 영상 | *(촬영 후 추가)* |
| 발표 자료 | *(작성 후 추가)* |

---

## 📁 프로젝트 구조

```
260530 PBL-4/
├── src/
│   ├── app/
│   │   ├── auth/             # 인증 (login, signup, callback)
│   │   ├── dashboard/        # 대시보드 (정책 매칭 결과)
│   │   ├── policies/[id]/    # 정책 상세 페이지
│   │   ├── profile/          # 사용자 프로필 관리
│   │   ├── wallet/           # Policy Wallet (관심 정책 관리)
│   │   ├── layout.js         # 공통 레이아웃 (네비게이션)
│   │   ├── page.js           # 랜딩 페이지
│   │   └── globals.css       # 글로벌 스타일 (Spotify 테마)
│   └── lib/
│       ├── supabase.js       # Supabase 클라이언트 초기화
│       ├── diagnosis.js      # 정책 매칭 진단 엔진
│       └── policies-seed.js  # 정책 시드 데이터 & 시딩 함수
├── PRD.md                    # 제품 요구사항 정의서
├── DESIGN.md                 # 디자인 시스템 문서
├── PORTFOLIO.md              # 포트폴리오 개발일지 (이 파일)
├── README.md                 # 프로젝트 소개 및 실행 가이드
└── .env.local                # Supabase 환경 변수 (비공개)
```

---

*이 문서는 프로젝트 진행에 따라 지속적으로 업데이트됩니다.*
