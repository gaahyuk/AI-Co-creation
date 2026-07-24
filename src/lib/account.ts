"use client";

import { useEffect, useState } from "react";

// 로컬 계정 (youth.account) — 서버 회원가입/로그인 대신 브라우저에만 저장되는 간이 계정.
// 원본(장재영 브랜치)의 Supabase Auth 회원가입/로그인 흐름을
// "이 브라우저에 계정 만들기 / 계정 지우기"로 단순화해 이식한 것.

const ACCOUNT_KEY = "youth.account";

/** 로컬 계정 정보 */
export interface LocalAccount {
  name: string;
  email: string;
  createdAt: string; // ISO 문자열
}

export function loadAccount(): LocalAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as LocalAccount) : null;
  } catch {
    return null;
  }
}

export function saveAccount(account: LocalAccount): void {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function clearAccount(): void {
  localStorage.removeItem(ACCOUNT_KEY);
}

/** 로컬 계정 상태 훅 (localStorage 동기화) */
export function useAccount() {
  const [account, setAccount] = useState<LocalAccount | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setAccount(loadAccount());
    setLoaded(true);
  }, []);

  /** 로컬 계정 생성 — 원본의 "회원가입"에 해당 */
  const create = (name: string, email: string): LocalAccount => {
    const next: LocalAccount = {
      name: name.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };
    saveAccount(next);
    setAccount(next);
    return next;
  };

  /** 로컬 계정 삭제 — 원본의 "로그아웃/탈퇴"에 해당 */
  const remove = () => {
    clearAccount();
    setAccount(null);
  };

  return { account, loaded, create, remove };
}
