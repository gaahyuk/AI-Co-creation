"use client";

// 자가진단 로직 — 참조 브랜치(장재영) src/lib/diagnosis.js 를
// 베이스 아키텍처(온통청년 Policy 타입 + localStorage)에 맞게 TS로 포팅.
// - 원본의 나이/지역/직업/소득 4개 축 검증과 25점 배점 방식을 유지한다.
// - 원본의 eligible_jobs 문자열 매칭(EMPLOYMENT_EXPANSION)은 베이스가 온통청년
//   jobCd 코드 체계를 쓰므로, 직업군 → jobCd 매핑(대학생/취준생/무직 → 미취업자 등)으로 흡수했다.
// - 결과는 youth.diagnosis 키에 저장한다.

import type { Policy, UserProfile } from "@/lib/youth/types";
import { JOB_NO_LIMIT_CODE } from "@/lib/regions";

const DIAGNOSIS_KEY = "youth.diagnosis";

/* ------------------------------------------------------------------ */
/* 선택지 정의                                                          */
/* ------------------------------------------------------------------ */

/** 취업상태 선택지 (원본 진단의 직업군 라벨 + 온통청년 jobCd 매핑) */
export interface EmploymentOption {
  id: string; // 원본 직업군 라벨
  label: string;
  desc: string;
  jobCode: string; // 온통청년 jobCd
}

export const EMPLOYMENT_OPTIONS: EmploymentOption[] = [
  { id: "대학생", label: "대학생", desc: "대학(원) 재학·휴학 중", jobCode: "0013003" },
  { id: "취업준비생", label: "취업준비생", desc: "졸업 후 구직 활동 중", jobCode: "0013003" },
  { id: "사회초년생", label: "사회초년생", desc: "취업 5년 이내 재직 중", jobCode: "0013001" },
  { id: "소상공인", label: "소상공인·창업가", desc: "자영업·사업체 운영 중", jobCode: "0013002" },
  { id: "무직", label: "무직", desc: "지금은 일을 쉬고 있어요", jobCode: "0013003" },
  { id: "기타", label: "기타", desc: "프리랜서·단기근로 등", jobCode: "0013009" },
];

/** 소득 구간 선택지 (원본 parseIncomeLevel 의 중위소득 % 구간을 그대로 유지) */
export interface IncomeLevelOption {
  id: string;
  label: string;
  percent: number; // 중위소득 대비 % (200 = 제한 없음/초과)
  monthlyManwon: number | null; // 1인 가구 기준 월 소득 추정치 (만원)
}

export const INCOME_LEVELS: IncomeLevelOption[] = [
  { id: "le50", label: "중위소득 50% 이하", percent: 50, monthlyManwon: 120 },
  { id: "le100", label: "중위소득 100% 이하", percent: 100, monthlyManwon: 240 },
  { id: "le120", label: "중위소득 120% 이하", percent: 120, monthlyManwon: 290 },
  { id: "le150", label: "중위소득 150% 이하", percent: 150, monthlyManwon: 360 },
  { id: "le180", label: "중위소득 180% 이하", percent: 180, monthlyManwon: 430 },
  { id: "over", label: "150% 초과 / 잘 모름", percent: 200, monthlyManwon: null },
];

/* ------------------------------------------------------------------ */
/* 원본 포팅 함수                                                       */
/* ------------------------------------------------------------------ */

/** 생년월일(YYYY-MM-DD) 기준 만 나이 계산 (원본 calculateAge 포팅) */
export function calculateAge(birthDateString: string): number | null {
  if (!birthDateString) return null;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  if (isNaN(birthDate.getTime())) return null; // 유효하지 않은 날짜 포맷 방어

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/** 소득 구간 문자열을 비교값(중위소득 %)으로 변환 (원본 parseIncomeLevel 포팅) */
export function parseIncomeLevel(level: string | null | undefined): number {
  if (!level) return 200; // 기본값: 제한 없음 혹은 최상위 소득
  if (level.includes("50% 이하")) return 50;
  if (level.includes("100% 이하")) return 100;
  if (level.includes("120% 이하")) return 120;
  if (level.includes("150% 이하")) return 150;
  if (level.includes("180% 이하")) return 180;
  return 200; // 150% 초과 또는 제한 없음
}

/* ------------------------------------------------------------------ */
/* 진단 결과 타입                                                       */
/* ------------------------------------------------------------------ */

/** 단계별 질문 응답 */
export interface DiagnosisAnswers {
  birthDate: string; // YYYY-MM-DD
  sidoCode: string; // 시도 2자리 ("" = 전국)
  regionCode: string; // 시군구 5자리 ("" = 시도 전체)
  employmentId: string; // EMPLOYMENT_OPTIONS.id
  incomeLevelId: string; // INCOME_LEVELS.id
  interests: string[]; // 표준 5분류명 (복수 선택)
}

/** 진단으로 판정된 맞춤 정책 유형 */
export interface DiagnosisType {
  id: string;
  emoji: string;
  title: string;
  description: string;
  categories: string[]; // 추천 정책 분야 (우선순위순)
}

/** youth.diagnosis 에 저장되는 최종 결과 */
export interface DiagnosisResult {
  answers: DiagnosisAnswers;
  age: number | null; // 만 나이
  jobCode: string; // 온통청년 jobCd
  incomePercent: number; // 중위소득 대비 %
  incomeManwon: number | null; // 월 소득 추정치 (만원)
  type: DiagnosisType;
  recommendedCategories: string[]; // 관심분야 + 유형 추천 분야 (중복 제거)
  tips: string[]; // 맞춤 안내 문구
  createdAt: string; // ISO 문자열
}

/* ------------------------------------------------------------------ */
/* 유형 진단                                                            */
/* ------------------------------------------------------------------ */

/** 직업군별 기본 유형 정의 */
const TYPE_BY_EMPLOYMENT: Record<string, DiagnosisType> = {
  대학생: {
    id: "campus",
    emoji: "🎓",
    title: "캠퍼스 성장형",
    description:
      "학업과 미래 준비를 병행하는 시기예요. 등록금·역량개발 같은 교육 지원과 청년 인턴십 정책부터 챙겨보세요.",
    categories: ["교육", "일자리", "복지문화"],
  },
  취업준비생: {
    id: "jobseeker",
    emoji: "🚀",
    title: "취업 도약형",
    description:
      "구직 활동에 집중하는 시기예요. 구직촉진수당·취업지원 프로그램 등 일자리 정책의 핵심 대상이에요.",
    categories: ["일자리", "교육", "복지문화"],
  },
  사회초년생: {
    id: "starter",
    emoji: "💼",
    title: "자산 형성형",
    description:
      "소득이 생기기 시작한 지금이 자산 형성의 골든타임이에요. 청년 주거 지원과 목돈 마련 정책을 우선 확인하세요.",
    categories: ["주거", "복지문화", "일자리"],
  },
  소상공인: {
    id: "founder",
    emoji: "🏪",
    title: "창업 성장형",
    description:
      "사업을 키워가는 시기예요. 창업·경영 지원금과 청년 사업자 대상 금융 정책을 놓치지 마세요.",
    categories: ["일자리", "참여권리", "복지문화"],
  },
  무직: {
    id: "restart",
    emoji: "🌱",
    title: "재도약 준비형",
    description:
      "잠시 쉬어가는 시기도 준비 기간이에요. 생활 안정 지원과 재취업 프로그램을 함께 살펴보세요.",
    categories: ["일자리", "복지문화", "교육"],
  },
  기타: {
    id: "explorer",
    emoji: "🧭",
    title: "정책 탐색형",
    description:
      "다양한 형태로 활동하고 계시네요. 폭넓은 분야의 정책 중 자격이 맞는 것부터 하나씩 찾아보세요.",
    categories: ["복지문화", "일자리", "참여권리"],
  },
};

/** 응답을 종합해 진단 결과를 생성 */
export function buildDiagnosis(answers: DiagnosisAnswers): DiagnosisResult {
  const age = calculateAge(answers.birthDate);
  const employment =
    EMPLOYMENT_OPTIONS.find((e) => e.id === answers.employmentId) ??
    EMPLOYMENT_OPTIONS[EMPLOYMENT_OPTIONS.length - 1];
  const incomeLevel =
    INCOME_LEVELS.find((l) => l.id === answers.incomeLevelId) ??
    INCOME_LEVELS[INCOME_LEVELS.length - 1];
  const type = TYPE_BY_EMPLOYMENT[employment.id] ?? TYPE_BY_EMPLOYMENT["기타"];

  // 관심분야를 먼저, 유형 추천 분야를 뒤에 붙여 중복 제거
  const recommendedCategories = [...new Set([...answers.interests, ...type.categories])];

  // 맞춤 안내 문구
  const tips: string[] = [];
  if (incomeLevel.percent <= 100) {
    tips.push(
      "중위소득 100% 이하 구간이라 소득 연계형 지원(생활비·금융)을 받을 가능성이 높아요.",
    );
  }
  if (age !== null && age >= 30) {
    tips.push("만 30세 이상은 연령 상한(만 34~39세)이 가까운 정책이 많아요. 마감 연령을 먼저 확인하세요.");
  }
  if (age !== null && age <= 24) {
    tips.push("만 24세 이하 전용 정책(청소년·후기청소년 대상)도 함께 확인해보세요.");
  }
  if (answers.sidoCode) {
    tips.push("거주 지역 전용 정책은 전국 정책보다 경쟁이 덜한 편이니 우선 신청해보세요.");
  } else {
    tips.push("거주 지역을 선택하면 지역 전용 정책까지 정확하게 찾아드려요.");
  }

  return {
    answers,
    age,
    jobCode: employment.jobCode,
    incomePercent: incomeLevel.percent,
    incomeManwon: incomeLevel.monthlyManwon,
    type,
    recommendedCategories,
    tips,
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* 정책별 적합도 진단 (원본 diagnosePolicy 포팅)                          */
/* ------------------------------------------------------------------ */

export interface PolicyDiagnosisDetail {
  pass: boolean;
  message: string;
}

export interface PolicyDiagnosis {
  isEligible: boolean;
  score: number; // 0~100 적합도
  details: {
    age: PolicyDiagnosisDetail;
    location: PolicyDiagnosisDetail;
    job: PolicyDiagnosisDetail;
    income: PolicyDiagnosisDetail;
  };
}

/**
 * 진단 결과와 정책의 요구 조건을 비교해 자격 부합 여부와 적합도 점수(%)를 산출.
 * 원본의 4개 축(나이/지역/직업/소득) × 25점 배점과
 * "제한 있는 조건을 충족하면 가점(25), 제한 없음 충족은 20점" 규칙을 유지한다.
 * 소득은 온통청년 earnMaxAmt 의 단위·기준이 정책마다 달라(베이스 eligibility.ts 와 동일한 이유로)
 * 부적격 판정에서는 제외하고 안내로만 반영한다.
 */
export function diagnosePolicy(result: DiagnosisResult, policy: Policy): PolicyDiagnosis {
  const out: PolicyDiagnosis = {
    isEligible: false,
    score: 0,
    details: {
      age: { pass: true, message: "나이 조건 충족" },
      location: { pass: true, message: "거주지 조건 충족" },
      job: { pass: true, message: "직업 조건 충족" },
      income: { pass: true, message: "소득 조건 충족" },
    },
  };

  // 1. 나이 검증 (0 또는 null 은 제한 없음으로 간주 — 베이스 eligibility.ts 와 동일)
  const minAge = policy.minAge && policy.minAge > 0 ? policy.minAge : null;
  const maxAge = policy.maxAge && policy.maxAge > 0 ? policy.maxAge : null;
  const ageLimited = policy.ageLimited && (minAge !== null || maxAge !== null);
  if (!ageLimited) {
    out.details.age.message = "연령 제한 없음";
  } else if (result.age === null) {
    out.details.age.pass = false;
    out.details.age.message = "생년월일이 등록되지 않았습니다.";
  } else {
    const lo = minAge ?? 0;
    const hi = maxAge ?? 150;
    if (result.age < lo || result.age > hi) {
      out.details.age.pass = false;
      out.details.age.message = `대상 나이(만 ${lo}~${hi}세)가 아닙니다. (현재 만 ${result.age}세)`;
    } else {
      out.details.age.message = `대상 나이 충족 (현재 만 ${result.age}세)`;
    }
  }

  // 2. 지역 검증 (법정동코드 prefix 매칭 — 베이스 eligibility.ts 방식)
  const userRegion = result.answers.regionCode || result.answers.sidoCode;
  const isLocalPolicy = policy.regionCodes.length > 0;
  if (!isLocalPolicy) {
    out.details.location.message = "전국 단위 지원 (지역 제한 없음)";
  } else if (!userRegion) {
    out.details.location.pass = false;
    out.details.location.message = "거주지역 정보가 등록되지 않았습니다.";
  } else {
    const prefix = userRegion.slice(0, 5);
    const matched = policy.regionCodes.some(
      (c) => c.startsWith(prefix) || prefix.startsWith(c.slice(0, 5)),
    );
    if (matched) {
      out.details.location.message = "지역 조건 충족 (거주 지역 대상)";
    } else {
      out.details.location.pass = false;
      out.details.location.message = "지원 가능 지역이 아닙니다. (특정 지역 제한)";
    }
  }

  // 3. 직업/고용상태 검증 (원본의 문자열 직업군 매칭을 jobCd 코드 매칭으로 흡수)
  const jobUnrestricted =
    policy.jobCodes.length === 0 || policy.jobCodes.includes(JOB_NO_LIMIT_CODE);
  const isSpecificJob = !jobUnrestricted;
  if (jobUnrestricted) {
    out.details.job.message = "직업 제한 없음 (전체 대상)";
  } else if (!result.jobCode) {
    out.details.job.pass = false;
    out.details.job.message = "직업/고용 상태 정보가 등록되지 않았습니다.";
  } else if (policy.jobCodes.includes(result.jobCode)) {
    out.details.job.message = `직업 조건 충족 (${result.answers.employmentId})`;
  } else {
    out.details.job.pass = false;
    out.details.job.message = "지원 대상 직업군이 아닙니다.";
  }

  // 4. 소득 요건: 단위가 정책마다 달라 부적격 판정에서 제외, 안내만 제공
  const hasIncomeLimit = policy.earnMax !== null && policy.earnMax > 0;
  if (!hasIncomeLimit) {
    out.details.income.message = "소득 제한 없음";
  } else {
    out.details.income.message = "소득 조건 있음 — 정책 원문 확인 필요";
  }

  // 5. 종합 점수 (원본 배점: 제한 있는 조건 충족 25점, 제한 없음 충족 20점)
  let score = 0;
  if (out.details.age.pass) score += ageLimited ? 25 : 20;
  if (out.details.location.pass) score += isLocalPolicy ? 25 : 20;
  if (out.details.job.pass) score += isSpecificJob ? 25 : 20;
  if (out.details.income.pass) score += hasIncomeLimit ? 15 : 20; // 확인 필요 조건은 보수적으로 15점
  out.score = Math.min(100, score);

  // 소득을 제외한 3개 축이 모두 충족될 때 신청 가능 판정
  out.isEligible = out.details.age.pass && out.details.location.pass && out.details.job.pass;

  return out;
}

/* ------------------------------------------------------------------ */
/* 프로필 연동 · localStorage                                           */
/* ------------------------------------------------------------------ */

/** 진단 결과를 베이스 UserProfile 형태로 변환 (youth.profile 반영용) */
export function diagnosisToProfile(result: DiagnosisResult): UserProfile {
  return {
    age: result.age ?? undefined,
    regionCode: result.answers.regionCode || undefined,
    sidoCode:
      !result.answers.regionCode && result.answers.sidoCode
        ? result.answers.sidoCode
        : undefined,
    jobCode: result.jobCode || undefined,
    income: result.incomeManwon ?? undefined,
    interests:
      result.answers.interests.length > 0 ? result.answers.interests : undefined,
  };
}

export function loadDiagnosis(): DiagnosisResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DIAGNOSIS_KEY);
    return raw ? (JSON.parse(raw) as DiagnosisResult) : null;
  } catch {
    return null;
  }
}

export function saveDiagnosis(result: DiagnosisResult): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DIAGNOSIS_KEY, JSON.stringify(result));
}

export function clearDiagnosis(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DIAGNOSIS_KEY);
}
