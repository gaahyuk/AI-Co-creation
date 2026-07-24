"use client";

import { useEffect, useState } from "react";

const COMPARE_KEY = "youth.compare";

/** 비교함 최대 선택 개수 */
export const MAX_COMPARE = 3;

/** 비교 선택된 정책 ID 배열 로드 (SSR 안전) */
export function loadCompare(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 비교함(youth.compare) 선택 상태 훅 — localStorage 동기화 */
export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIds(loadCompare());
    setLoaded(true);
  }, []);

  const persist = (next: string[]) => {
    setIds(next);
    localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
  };

  /** 선택 토글 — 최대 MAX_COMPARE개까지만 추가 */
  const toggle = (id: string) => {
    if (ids.includes(id)) {
      persist(ids.filter((x) => x !== id));
    } else if (ids.length < MAX_COMPARE) {
      persist([...ids, id]);
    }
  };

  const remove = (id: string) => persist(ids.filter((x) => x !== id));

  const clear = () => persist([]);

  /** 유효한 ID 목록(예: 현재 북마크)만 남기고 정리 — 북마크 해제된 정책 제거용 */
  const prune = (validIds: string[]) => {
    const next = ids.filter((x) => validIds.includes(x));
    if (next.length !== ids.length) persist(next);
  };

  return {
    ids,
    loaded,
    toggle,
    remove,
    clear,
    prune,
    has: (id: string) => ids.includes(id),
    canAdd: ids.length < MAX_COMPARE,
  };
}
