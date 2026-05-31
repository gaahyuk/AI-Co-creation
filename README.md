# 🏛️ PolicyFlow AI

> **AI 기반 정책 수혜 자동화 플랫폼** — 정책을 검색하는 시대를 끝내다.

사용자의 조건(나이, 거주지, 직업, 소득)을 분석하여 받을 수 있는 정부·지자체 정책을 **자동으로 매칭**하고, 신청 준비부터 일정 관리까지 지원하는 원스톱 플랫폼입니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **🔍 정책 매칭 진단** | 생년월일·거주지·직업·소득 4축 기반 자격 자동 판별 및 적합도 점수(%) 산출 |
| **💼 Policy Wallet** | 관심 정책 저장, 신청 상태 추적 (미신청 → 준비중 → 신청완료 → 수혜완료) |
| **📄 서류 관리** | PDF/이미지 서류 업로드, 자동 분류, 여러 정책 신청에 재사용 |
| **⏰ 마감일 알림** | 정책 마감 D-7, D-3, D-1 자동 알림 (예정) |
| **🔐 사용자 인증** | 이메일 회원가입/로그인 (Supabase Auth) |

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | Next.js 16 (App Router), React 19, TailwindCSS 4 |
| **Backend** | Supabase (PostgreSQL 17, Auth, Storage, RLS) |
| **Design** | Spotify-Inspired Dark Theme (커스텀 디자인 시스템) |
| **DevOps** | Supabase MCP, Vercel (예정) |

---

## 🚀 시작하기

### 사전 요구사항

- [Node.js](https://nodejs.org/) 18.x 이상
- [Supabase](https://supabase.com/) 프로젝트 (무료 티어 가능)

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
# 프로젝트 루트에 .env.local 파일을 생성하고 아래 내용을 입력하세요.
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 3. 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 결과를 확인하세요.

### 데이터베이스 초기화

앱 실행 후 랜딩 페이지 하단의 **「데이터베이스 정책 시딩」** 버튼을 클릭하면 테스트용 정책 데이터 4종이 자동으로 적재됩니다.

---

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── auth/              # 인증 (login, signup, callback)
│   ├── dashboard/         # 대시보드 (정책 매칭 결과)
│   ├── policies/[id]/     # 정책 상세 페이지
│   ├── profile/           # 사용자 프로필 관리
│   ├── wallet/            # Policy Wallet
│   ├── layout.js          # 공통 레이아웃
│   ├── page.js            # 랜딩 페이지
│   └── globals.css        # Spotify 테마 글로벌 스타일
└── lib/
    ├── supabase.js        # Supabase 클라이언트
    ├── diagnosis.js       # 정책 매칭 진단 엔진
    └── policies-seed.js   # 시드 데이터
```

---

## 📐 데이터베이스 스키마

| 테이블 | 설명 | RLS |
|--------|------|-----|
| `profiles` | 사용자 프로필 (auth.users 연동) | ✅ 본인만 접근 |
| `policies` | 정책 정보 (자격 조건, 혜택, 마감일) | ✅ 전체 읽기 |
| `documents` | 사용자 업로드 서류 | ✅ 본인만 접근 |
| `applications` | 정책 신청 이력 및 상태 | ✅ 본인만 접근 |

---

## 📚 문서

| 문서 | 설명 |
|------|------|
| [PRD.md](./PRD.md) | 제품 요구사항 정의서 |
| [DESIGN.md](./DESIGN.md) | 디자인 시스템 (Spotify 인스파이어) |
| [PORTFOLIO.md](./PORTFOLIO.md) | 포트폴리오 개발일지 및 회고 |

---

## 📜 라이선스

이 프로젝트는 학습 및 포트폴리오 목적으로 제작되었습니다.
