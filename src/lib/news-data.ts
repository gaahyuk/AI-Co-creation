"use client";

// 뉴스/뉴스레터 데이터 계층
// - 시드 뉴스: 참조 브랜치(scripts/seed-news.ts)의 실데이터를 정적 이식
// - 관리자 뉴스: 관리자 페이지가 localStorage(youth.news.custom)에 저장한 항목을 병합
// - 뉴스레터: localStorage(youth.newsletter)에 구독 상태 저장

import { useEffect, useState } from "react";

const CUSTOM_NEWS_KEY = "youth.news.custom";
const NEWSLETTER_KEY = "youth.newsletter";

/** 앱 내부에서 사용하는 뉴스 항목 (시드 + 관리자 등록 통합 모델) */
export interface NewsItem {
  id: string;
  title: string;
  summary: string; // 내용 요약 (원본 content)
  category: string; // 카테고리 (전체/일자리/주거/교육/복지문화/참여권리/자산형성/공지)
  source: string; // 출처 기관명
  url: string | null; // 원문 링크
  date: string; // 게시일 (YYYY-MM-DD 또는 ISO 문자열)
  isCustom?: boolean; // 관리자(youth.news.custom)가 추가한 뉴스 여부
}

/** 관리자 페이지가 youth.news.custom에 저장하는 원본 형태 */
interface CustomNewsRaw {
  id?: string;
  title?: string;
  summary?: string;
  url?: string;
  date?: string;
}

/** 뉴스 카테고리 필터 목록 (전체 제외) */
export const NEWS_CATEGORIES = [
  "일자리",
  "주거",
  "교육",
  "복지문화",
  "참여권리",
  "자산형성",
];

/** 시드 뉴스 데이터 (참조 브랜치 seed-news.ts에서 정적 이식) */
export const SEED_NEWS: NewsItem[] = [
  {
    id: "seed-news-1",
    title: "2024년 청년내일저축계좌 신청 기간 연장",
    summary:
      "정부는 청년내일저축계좌의 신청 기간을 6개월 더 연장하기로 결정했습니다. 더 많은 청년들이 자산을 형성할 수 있는 기회를 제공하기 위함입니다.",
    source: "온통청년",
    category: "자산형성",
    url: "https://www.youthcenter.go.kr",
    date: "2025-07-01",
  },
  {
    id: "seed-news-2",
    title: "청년월세지원 신청자격 완화",
    summary:
      "기존에는 월세 15만원 이상이어야 했으나, 앞으로 10만원 이상에서도 신청할 수 있습니다.",
    source: "온통청년",
    category: "주거",
    url: "https://www.youthcenter.go.kr",
    date: "2025-06-20",
  },
  {
    id: "seed-news-3",
    title: "2025년 청년 일자리 정책 강화",
    summary:
      "정부는 청년 일자리 창출을 위해 내년 예산을 30% 증액하기로 발표했습니다. 신규 기업 지원과 전직 교육 프로그램이 확대됩니다.",
    source: "온통청년",
    category: "일자리",
    url: "https://www.youthcenter.go.kr",
    date: "2025-06-10",
  },
  {
    id: "seed-news-4",
    title: "국가장학금 2학기 모집 시작",
    summary:
      "2024학년도 2학기 국가장학금 신청이 시작되었습니다. 온라인 신청만 가능하며, 서류 제출 기한은 7월 31일입니다.",
    source: "한국장학재단",
    category: "교육",
    url: "https://www.kosaf.go.kr",
    date: "2025-05-28",
  },
  {
    id: "seed-news-5",
    title: "지역별 청년정책 신규 공모",
    summary:
      "전국 시도에서 청년을 위한 특화된 정책들을 새로 공모하고 있습니다. 거주 지역의 정책을 꼭 확인해보세요.",
    source: "온통청년",
    category: "참여권리",
    url: "https://www.youthcenter.go.kr",
    date: "2025-05-15",
  },
];

/** 관리자가 추가한 뉴스(youth.news.custom) 읽기 — 항목 형태가 어긋나도 안전하게 정규화 */
export function loadCustomNews(): NewsItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_NEWS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as CustomNewsRaw[];
    if (!Array.isArray(list)) return [];
    return list
      .filter((n) => n && typeof n.title === "string" && n.title.trim().length > 0)
      .map((n, i) => ({
        id: typeof n.id === "string" && n.id ? n.id : `custom-${i}`,
        title: (n.title as string).trim(),
        summary: typeof n.summary === "string" ? n.summary : "",
        category: "공지",
        source: "관리자 등록",
        url: typeof n.url === "string" && n.url.trim() ? n.url.trim() : null,
        date: typeof n.date === "string" ? n.date : "",
        isCustom: true,
      }));
  } catch {
    return [];
  }
}

/** 시드 뉴스 + 관리자 뉴스 병합 (최신순 정렬) */
export function getAllNews(): NewsItem[] {
  return [...SEED_NEWS, ...loadCustomNews()].sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  );
}

/** 뉴스 목록 훅 — 마운트 후 localStorage를 반영해 병합 목록 제공 */
export function useNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(getAllNews());
    setLoaded(true);
  }, []);

  return { items, loaded };
}

// ---------------------------------------------------------------------------
// 뉴스레터 구독 (youth.newsletter)
// ---------------------------------------------------------------------------

/** 뉴스레터 구독 상태 — 기본 계약은 {email, subscribed}, 나머지는 부가 설정 */
export interface NewsletterState {
  email: string;
  subscribed: boolean;
  categories?: string[]; // 관심 카테고리 (선택)
  frequency?: "daily" | "weekly" | "monthly"; // 수신 빈도 (선택)
}

export function loadNewsletter(): NewsletterState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(NEWSLETTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NewsletterState;
    if (!parsed || typeof parsed.email !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveNewsletter(state: NewsletterState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(state));
}

/** 간단한 이메일 형식 검사 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** 뉴스레터 구독 상태 훅 (localStorage 동기화) */
export function useNewsletter() {
  const [newsletter, setNewsletter] = useState<NewsletterState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setNewsletter(loadNewsletter());
    setLoaded(true);
  }, []);

  const subscribe = (
    email: string,
    categories?: string[],
    frequency?: "daily" | "weekly" | "monthly",
  ) => {
    const next: NewsletterState = {
      email: email.trim(),
      subscribed: true,
      categories: categories ?? newsletter?.categories,
      frequency: frequency ?? newsletter?.frequency ?? "weekly",
    };
    saveNewsletter(next);
    setNewsletter(next);
  };

  const unsubscribe = () => {
    if (!newsletter) return;
    const next: NewsletterState = { ...newsletter, subscribed: false };
    saveNewsletter(next);
    setNewsletter(next);
  };

  return { newsletter, loaded, subscribe, unsubscribe };
}
