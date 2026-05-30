# PRD.md

# PolicyFlow AI

## AI 기반 정책 수혜 자동화 플랫폼

Version: 1.0

Owner: Product Team

Status: Draft

Last Updated: 2026-05-30

---

# 1. Product Overview

## Product Vision

정책을 검색하는 시대를 끝내고, AI가 개인에게 적합한 정책을 탐색하고 신청 준비를 지원하는 정책 수혜 자동화 플랫폼을 구축한다.

---

## Problem Statement

현재 사용자는

* 정책 존재를 알지 못함
* 자격 여부를 판단하기 어려움
* 신청 마감일을 놓침
* 제출 서류 준비가 번거로움

등의 이유로 정책 혜택을 받지 못하고 있다.

기존 플랫폼은 정책 정보 제공에 집중되어 있으며 실제 신청 완료까지 지원하지 못한다.

---

## Solution

PolicyFlow AI는

* 정책 탐색
* 자격 진단
* 서류 관리
* 신청 준비
* 일정 관리

를 하나의 서비스에서 제공한다.

---

# 2. Goals

## Business Goals

### B2C

* 사용자 정책 수혜율 향상
* 사용자 행동 데이터 확보

### B2G

* 정책 전달 효율 향상
* 정책 홍보 자동화

---

## Product Goals

사용자가

"내가 받을 수 있는 정책이 무엇인지"

5분 이내에 파악 가능하도록 한다.

---

## Success Metrics

### North Star Metric

사용자당 발견된 예상 수혜 금액

---

### KPI

* 가입자 수
* 정책 매칭 수
* 정책 저장 수
* 신청 시작률
* 신청 완료율
* 서류 업로드율
* 알림 클릭률

---

# 3. Target Users

## Primary User

청년

연령

19~39세

특징

* 대학생
* 취업준비생
* 사회초년생

---

## Secondary User

* 소상공인
* 경력단절여성
* 농업인

(향후 확장)

---

## Pain Points

### 정책 탐색

"무슨 정책이 있는지 모르겠다"

---

### 자격 확인

"내가 대상자인지 모르겠다"

---

### 신청 과정

"서류가 너무 많다"

---

### 마감 관리

"알았는데 신청 시기를 놓쳤다"

---

# 4. User Journey

## Step 1

회원가입

↓

기본 프로필 입력

---

## Step 2

정책 진단

↓

정책 추천

---

## Step 3

관심 정책 저장

↓

알림 등록

---

## Step 4

서류 준비

↓

Policy Wallet 저장

---

## Step 5

신청 진행

↓

수혜 완료

---

# 5. Core Features

---

## Feature 01

### Policy Diagnosis

설명

사용자의 조건을 기반으로 신청 가능한 정책을 자동 판별

---

Input

* 생년월일
* 거주지역
* 직업
* 소득구간

---

Output

* 신청 가능 정책
* 예상 수혜 금액
* 신청 마감일

---

Priority

P0

---

## Feature 02

### Policy Recommendation Engine

설명

정책 적합도 계산

---

Output

정책별

* 적합도
* 예상 혜택
* 우선순위

---

Priority

P0

---

## Feature 03

### Policy Wallet

설명

사용자 정책 자산 저장 공간

---

저장 항목

* 기본 정보
* 신청 이력
* 수혜 이력
* 업로드 문서

---

Priority

P0

---

## Feature 04

### Document Manager

설명

정책 신청용 서류 관리

---

지원

* PDF
* JPG
* PNG

---

기능

* 업로드
* 자동 분류
* 재사용

---

Priority

P0

---

## Feature 05

### Deadline Guardian

설명

정책 일정 관리

---

알림

* 신청 시작
* 마감 7일 전
* 마감 3일 전
* 마감 1일 전

---

Priority

P0

---

## Feature 06

### AI Policy Interpreter

설명

행정 용어를 일반 언어로 변환

예시

기준 중위소득 150%

↓

월 소득 약 ○○원 이하

---

Priority

P1

---

## Feature 07

### AI Chat Advisor

설명

정책 상담 챗봇

예시

"인천 사는 28세인데 받을 수 있는 지원금 있어?"

---

Priority

P1

---

## Feature 08

### Benefit Graph

설명

사용자의 정책 상태를 기반으로 추가 정책 추천

예시

청년월세지원 신청

↓

청년도약계좌 추천

↓

국민취업지원제도 추천

---

Priority

P2

---

# 6. Functional Requirements

## Authentication

### Required

* 이메일 로그인
* 소셜 로그인

---

### Supported

* Google
* Kakao

---

## Profile

사용자는

* 연령
* 주소
* 직업
* 소득구간

을 수정 가능

---

## Policy Search

검색 조건

* 지역
* 연령
* 정책 유형

---

## Notification

채널

* 이메일
* 카카오 알림톡

---

# 7. AI Requirements

## AI Module 1

Policy Parsing

입력

정책 공고문

출력

구조화 데이터

---

## AI Module 2

Eligibility Analysis

입력

정책 조건

사용자 정보

출력

자격 여부

---

## AI Module 3

Natural Language Q&A

입력

사용자 질문

출력

정책 추천

---

# 8. Data Model

## User

* user_id
* birth_date
* location
* income_level
* employment_status

---

## Policy

* policy_id
* title
* category
* eligibility
* benefit_amount
* deadline

---

## Document

* document_id
* user_id
* file_url
* document_type

---

## Application

* application_id
* user_id
* policy_id
* status

---

# 9. MVP Scope

포함

* 회원가입
* 정책 진단
* 정책 추천
* Policy Wallet
* 서류 업로드
* 일정 알림

---

제외

* AI 챗봇
* OCR
* 자동 서류 생성
* 기관용 관리자 대시보드

---

# 10. Future Roadmap

## V1

정책 진단 플랫폼

---

## V2

AI 상담

AI 문서 분석

---

## V3

정책 신청 자동화

---

## V4

기관용 SaaS

정책 성과 분석

---

# 11. Risks

## 데이터 품질

정책 정보 최신성 유지 필요

---

## 개인정보

민감정보 저장 보안 요구

---

## 정책 변경

지속적 데이터 업데이트 필요

---

# 12. Definition of Success

사용자가

"어떤 정책을 받을 수 있는지"

찾는 시간을 줄이고

실제 정책 신청까지 완료할 수 있도록 지원하는 것.

궁극적으로는 정책 검색 서비스가 아닌 정책 수혜 자동화 플랫폼으로 발전한다.
