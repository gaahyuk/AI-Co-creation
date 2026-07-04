"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/youth/types";

const PROFILE_KEY = "youth.profile";
const BOOKMARK_KEY = "youth.bookmarks";

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** 프로필을 쿼리스트링으로 변환 (API 호출용) */
export function profileToQuery(profile: UserProfile | null): string {
  if (!profile) return "";
  const sp = new URLSearchParams();
  if (profile.age !== undefined) sp.set("age", String(profile.age));
  if (profile.regionCode) sp.set("regionCode", profile.regionCode);
  if (profile.sidoCode) sp.set("sido", profile.sidoCode);
  if (profile.jobCode) sp.set("jobCode", profile.jobCode);
  if (profile.income !== undefined) sp.set("income", String(profile.income));
  return sp.toString();
}

/** 프로필 상태 훅 (localStorage 동기화) */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const update = (p: UserProfile) => {
    saveProfile(p);
    setProfile(p);
  };

  return { profile, loaded, update };
}

const DOCS_PREFIX = "youth.docs.";

/** 제출서류 텍스트를 체크 항목으로 분해 (줄바꿈/번호/불릿 기준) */
export function splitDocuments(text: string): string[] {
  return (text ?? "")
    .split(/\r?\n|(?=\d+[.)]\s)|[•▶◦※-]\s/)
    .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
    .filter((s) => s.length >= 2);
}

/** 정책별 서류 준비 체크 상태 훅 (localStorage 동기화) */
export function useDocChecklist(plcyNo: string) {
  const [checked, setChecked] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCS_PREFIX + plcyNo);
      setChecked(raw ? (JSON.parse(raw) as number[]) : []);
    } catch {
      setChecked([]);
    }
  }, [plcyNo]);

  const toggle = (idx: number) => {
    setChecked((prev) => {
      const next = prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx];
      localStorage.setItem(DOCS_PREFIX + plcyNo, JSON.stringify(next));
      return next;
    });
  };

  return { checked, toggle, isChecked: (i: number) => checked.includes(i) };
}

/** 정책의 서류 준비율(0~1)을 localStorage에서 직접 계산 (목록 표시용) */
export function docProgress(plcyNo: string, documents: string): { done: number; total: number } {
  const total = splitDocuments(documents).length;
  if (typeof window === "undefined" || total === 0) return { done: 0, total };
  try {
    const raw = localStorage.getItem(DOCS_PREFIX + plcyNo);
    const done = raw ? (JSON.parse(raw) as number[]).length : 0;
    return { done: Math.min(done, total), total };
  } catch {
    return { done: 0, total };
  }
}

/** 북마크(저장한 정책 ID) 관리 훅 */
export function useBookmarks() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKMARK_KEY);
      setIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setIds([]);
    }
  }, []);

  const persist = (next: string[]) => {
    setIds(next);
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
  };

  const toggle = (id: string) => {
    persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  return { ids, toggle, has: (id: string) => ids.includes(id) };
}
