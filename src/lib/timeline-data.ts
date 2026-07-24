// 정책 시즌 캘린더 정적 데이터
// 참조: 이윤호 브랜치 scripts/seed-policy-timings.ts, scripts/seed-academic-calendar.ts,
//       src/app/api/timelines/{calendar,seasons}/route.ts 를 localStorage/정적 데이터 구조로 이식

/** 정책 신청 시즌 구분 */
export type Season =
  | "semester_start"
  | "summer"
  | "winter"
  | "spring"
  | "fall"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "all_year";

/** 시즌별 한국어 라벨 (참조 seasons API와 동일) */
export const SEASON_LABELS: Record<Season, string> = {
  semester_start: "학기 시작 (3월, 9월)",
  summer: "여름방학 (6-8월)",
  winter: "겨울방학 (12-2월)",
  spring: "봄 (3-5월)",
  fall: "가을 (9-11월)",
  q1: "1분기 (1-3월)",
  q2: "2분기 (4-6월)",
  q3: "3분기 (7-9월)",
  q4: "4분기 (10-12월)",
  all_year: "연중 상시",
};

/** 시즌별 짧은 배지 라벨 (월 네비게이션용) */
export const SEASON_BADGES: Record<Season, string> = {
  semester_start: "개강 시즌",
  summer: "여름방학",
  winter: "겨울방학",
  spring: "봄",
  fall: "가을",
  q1: "1분기",
  q2: "2분기",
  q3: "3분기",
  q4: "4분기",
  all_year: "연중 상시",
};

/** 월 → 해당 시즌 매핑 (참조 calendar API와 동일) */
export const MONTH_SEASONS: Record<number, Season[]> = {
  1: ["all_year", "winter", "q1"],
  2: ["all_year", "spring", "q1"],
  3: ["all_year", "semester_start", "spring", "q1"],
  4: ["all_year", "spring", "q2"],
  5: ["all_year", "spring", "q2"],
  6: ["all_year", "summer", "q2"],
  7: ["all_year", "summer", "q3"],
  8: ["all_year", "summer", "q3"],
  9: ["all_year", "semester_start", "fall", "q3"],
  10: ["all_year", "fall", "q4"],
  11: ["all_year", "fall", "q4"],
  12: ["all_year", "winter", "q4"],
};

/** 시즌별 신청 시기가 알려진 정책 유형 (시드 데이터) */
export interface PolicyTiming {
  /** 정책(유형) 이름 */
  name: string;
  /** 표준 5분류 카테고리 */
  category: "일자리" | "주거" | "교육" | "복지문화" | "참여권리";
  /** 해당하는 시즌들 */
  seasons: Season[];
  /** 공고가 몰리는 달 (비어 있으면 시즌 기준으로만 매칭) */
  optimalMonths: number[];
  /** 신청 시기 설명 */
  description: string;
  /** 정책 검색용 키워드 (홈 화면 검색 안내용) */
  keyword: string;
}

/**
 * 정책 타이밍 시드 (참조 seed-policy-timings.ts 4건 이식 + 대표 시즌 정책 보강).
 * 실제 공고 시기는 매년 다를 수 있어 "시즌 가이드" 성격의 정보.
 */
export const POLICY_TIMINGS: PolicyTiming[] = [
  {
    name: "국가장학금",
    category: "교육",
    seasons: ["semester_start"],
    optimalMonths: [3, 9],
    description: "봄·가을 학기 시작 시 신청",
    keyword: "국가장학금",
  },
  {
    name: "국가근로장학금",
    category: "교육",
    seasons: ["semester_start"],
    optimalMonths: [2, 8],
    description: "학기 시작 직전 모집 공고 집중",
    keyword: "근로장학",
  },
  {
    name: "청년내일저축계좌",
    category: "복지문화",
    seasons: ["all_year"],
    optimalMonths: [],
    description: "연중 상시 모집",
    keyword: "내일저축계좌",
  },
  {
    name: "청년월세 특별지원",
    category: "주거",
    seasons: ["all_year"],
    optimalMonths: [],
    description: "연중 상시 모집",
    keyword: "청년월세",
  },
  {
    name: "청년인턴",
    category: "일자리",
    seasons: ["summer", "winter"],
    optimalMonths: [6, 12],
    description: "여름·겨울방학 인턴십 신청",
    keyword: "인턴",
  },
  {
    name: "청년도약계좌",
    category: "복지문화",
    seasons: ["all_year"],
    optimalMonths: [],
    description: "매월 초 신청 접수",
    keyword: "도약계좌",
  },
  {
    name: "국민취업지원제도",
    category: "일자리",
    seasons: ["all_year"],
    optimalMonths: [],
    description: "연중 상시 신청",
    keyword: "국민취업지원",
  },
  {
    name: "청년 공공임대·행복주택 입주자 모집",
    category: "주거",
    seasons: ["q1", "q2", "q3", "q4"],
    optimalMonths: [3, 6, 9, 12],
    description: "분기별 입주자 모집 공고",
    keyword: "행복주택",
  },
  {
    name: "청년 창업지원사업 (예비창업패키지 등)",
    category: "일자리",
    seasons: ["q1"],
    optimalMonths: [1, 2],
    description: "연초(1~2월) 공고 집중",
    keyword: "창업",
  },
  {
    name: "청년 문화예술패스",
    category: "복지문화",
    seasons: ["spring"],
    optimalMonths: [3],
    description: "연초~봄 발급 시작",
    keyword: "문화예술패스",
  },
  {
    name: "청년정책 참여단·서포터즈",
    category: "참여권리",
    seasons: ["spring"],
    optimalMonths: [3, 4],
    description: "상반기(3~4월) 모집 집중",
    keyword: "서포터즈",
  },
  {
    name: "대학생 현장실습·코업 프로그램",
    category: "교육",
    seasons: ["summer", "winter"],
    optimalMonths: [6, 12],
    description: "방학 직전 학교별 모집",
    keyword: "현장실습",
  },
];

/** 학사일정 (참조 seed-academic-calendar.ts 이식 — 매년 반복되는 표준 일정) */
export interface AcademicEvent {
  month: number; // 이벤트가 속한 달
  name: string;
  period: string;
}

export interface AcademicSemester {
  semester: 1 | 2;
  /** 학기 기간 표기 */
  periodLabel: string;
  /** 개강하는 달 */
  startMonth: number;
  /** 학기 중인 달 (개강 달 포함) */
  semesterMonths: number[];
  /** 방학 이름/기간 */
  vacationLabel: string;
  vacationPeriodLabel: string;
  /** 방학에 걸치는 달 */
  vacationMonths: number[];
  /** 수강신청 등 학사 이벤트 */
  events: AcademicEvent[];
}

export const ACADEMIC_CALENDAR: AcademicSemester[] = [
  {
    semester: 1,
    periodLabel: "3월 1일 ~ 7월 31일",
    startMonth: 3,
    semesterMonths: [3, 4, 5, 6],
    vacationLabel: "여름방학",
    vacationPeriodLabel: "7월 1일 ~ 9월 1일",
    vacationMonths: [7, 8],
    events: [
      { month: 3, name: "수강신청", period: "3월 15일 ~ 3월 20일" },
      { month: 3, name: "수강신청 정정기간", period: "3월 21일 ~ 3월 27일" },
      { month: 4, name: "추가 정정기간", period: "4월 1일 ~ 4월 7일" },
    ],
  },
  {
    semester: 2,
    periodLabel: "9월 1일 ~ 12월 31일",
    startMonth: 9,
    semesterMonths: [9, 10, 11, 12],
    vacationLabel: "겨울방학",
    vacationPeriodLabel: "1월 1일 ~ 3월 1일",
    vacationMonths: [1, 2],
    events: [
      { month: 8, name: "수강신청", period: "8월 15일 ~ 8월 20일" },
      { month: 8, name: "수강신청 정정기간", period: "8월 21일 ~ 8월 27일" },
      { month: 9, name: "추가 정정기간", period: "9월 1일 ~ 9월 7일" },
    ],
  },
];

/** 학사일정 연계 알림 */
export interface AcademicNotice {
  icon: string;
  title: string;
  body: string;
}

/** 해당 월의 학사일정 연계 알림을 만든다 (방학/개강 시즌 정책 안내 포함) */
export function academicNoticesForMonth(month: number): AcademicNotice[] {
  const notices: AcademicNotice[] = [];

  for (const sem of ACADEMIC_CALENDAR) {
    // 개강 달: 교육 정책 신청 최적기 안내
    if (sem.startMonth === month) {
      notices.push({
        icon: "🎓",
        title: `${sem.semester}학기 개강 시즌`,
        body: "국가장학금 등 교육 관련 정책 신청의 최적 시기예요.",
      });
    }
    // 방학 달: 방학 시즌 정책 안내
    if (sem.vacationMonths.includes(month)) {
      notices.push({
        icon: sem.vacationLabel === "여름방학" ? "☀️" : "❄️",
        title: `${sem.vacationLabel} 시즌 (${sem.vacationPeriodLabel})`,
        body:
          sem.vacationLabel === "여름방학"
            ? "청년인턴·현장실습 등 실무 경험 프로그램에 도전해보세요."
            : "집중 교육·겨울 인턴 프로그램 신청 기간이에요.",
      });
    }
  }
  return notices;
}

/** 해당 월의 학사 이벤트(수강신청 등) 목록 */
export function academicEventsForMonth(month: number): AcademicEvent[] {
  return ACADEMIC_CALENDAR.flatMap((sem) =>
    sem.events.filter((e) => e.month === month),
  );
}

/** 해당 월의 시즌 목록 */
export function seasonsForMonth(month: number): Season[] {
  return MONTH_SEASONS[month] ?? [];
}

/** 월별로 그룹화된 시즌 정책 (신청 적기 / 시즌 해당 / 연중 상시) */
export interface MonthTimings {
  /** 이달이 공고 집중(신청 적기)인 정책 */
  optimal: PolicyTiming[];
  /** 이달 시즌에 해당하는 정책 (상시 제외) */
  seasonal: PolicyTiming[];
  /** 연중 상시 정책 */
  allYear: PolicyTiming[];
}

/** 해당 월에 해당하는 시즌 정책들을 그룹화해 반환 */
export function timingsForMonth(month: number): MonthTimings {
  const seasons = seasonsForMonth(month);
  const optimal: PolicyTiming[] = [];
  const seasonal: PolicyTiming[] = [];
  const allYear: PolicyTiming[] = [];

  for (const t of POLICY_TIMINGS) {
    if (t.seasons.includes("all_year")) {
      allYear.push(t);
    } else if (t.optimalMonths.includes(month)) {
      optimal.push(t);
    } else if (t.seasons.some((s) => seasons.includes(s))) {
      seasonal.push(t);
    }
  }
  return { optimal, seasonal, allYear };
}

/** 월별 시즌 정책 밀집도 (상시 제외) — 어느 달에 공고가 몰리는지 차트용 */
export function monthlyDensity(): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const { optimal, seasonal } = timingsForMonth(i + 1);
    return optimal.length + seasonal.length;
  });
}
