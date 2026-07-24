"use client";

// 정책 상세 커뮤니티 기능(후기/QnA/성공사례/제보) 공용 localStorage 유틸.
// 키 계약: youth.reviews.<plcyNo> / youth.qna.<plcyNo> / youth.stories.<plcyNo>

import { useCallback, useEffect, useState } from "react";

/** 후기(리뷰) 항목 — 별점 + 텍스트, 좋아요/답글 (장재영 브랜치 방식 포팅) */
export interface ReviewItem {
  id: string;
  rating: number; // 1~5 (답글은 0)
  content: string;
  author: string;
  likes: number;
  likedByMe: boolean;
  parentId: string | null; // 답글이면 부모 후기 id
  createdAt: string; // ISO
}

/** QnA 항목 — 질문 + (선택) 답변 */
export interface QnaItem {
  id: string;
  question: string;
  answer: string | null;
  author: string;
  createdAt: string; // ISO
  answeredAt: string | null;
}

/** 성공사례 항목 (이윤호 브랜치 success-stories 포팅) */
export interface StoryItem {
  id: string;
  title: string;
  content: string;
  receivedAmount: number | null; // 받은 금액 (만원)
  daysToReceive: number | null; // 수령까지 걸린 기간 (일)
  author: string;
  createdAt: string; // ISO
}

/** 실시간 익명 제보 유형 (이윤호 브랜치 TIP_TYPES 정적 규칙 이식) */
export const TIP_TYPES = [
  { code: "site_down", name: "사이트 접속 안됨/에러", icon: "🔴" },
  { code: "document_tip", name: "서류 준비 팁", icon: "📄" },
  { code: "budget_exhausted", name: "예산 소진 임박/마감된 듯", icon: "⚠️" },
  { code: "general", name: "기타", icon: "💬" },
] as const;

/** 카드에 경고를 띄울 "심각한" 제보 유형 */
export const URGENT_TIP_TYPES: readonly string[] = ["site_down", "budget_exhausted"];

export interface TipItem {
  id: string;
  content: string;
  tipType: string; // TIP_TYPES code
  createdAt: string; // ISO
}

export function tipTypeInfo(code: string) {
  return TIP_TYPES.find((t) => t.code === code) ?? TIP_TYPES[TIP_TYPES.length - 1];
}

/** 간단한 고유 id 생성 */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** 로컬 계정(youth.account)의 이름 — 없으면 "익명" */
export function loadAccountName(): string {
  if (typeof window === "undefined") return "익명";
  try {
    const raw = localStorage.getItem("youth.account");
    if (!raw) return "익명";
    const acc = JSON.parse(raw) as { name?: string };
    return acc.name && acc.name.trim() ? acc.name.trim() : "익명";
  } catch {
    return "익명";
  }
}

/** "방금 전 / n분 전 / n시간 전 / n일 전" 상대 시각 표기 */
export function timeAgoKo(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSec < 60) return "방금 전";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

/** localStorage에 저장되는 배열 상태 훅 (클라이언트 전용) */
export function useLocalList<T>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      setItems(raw ? (JSON.parse(raw) as T[]) : []);
    } catch {
      setItems([]);
    }
    setLoaded(true);
  }, [key]);

  const update = useCallback(
    (next: T[]) => {
      setItems(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // 저장 실패(용량 초과 등)는 조용히 무시
      }
    },
    [key]
  );

  return { items, loaded, update };
}
