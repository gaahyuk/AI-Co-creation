"use client";

import { useEffect, useState } from "react";

/** 지갑 항목 상태: 관심 → 신청중 → 수령완료 */
export type WalletStatus = "interested" | "applied" | "received";

/** youth.wallet 항목 (localStorage 계약) */
export interface WalletEntry {
  policyId: string;
  policyName: string;
  status: WalletStatus;
  amount: number | null; // 지원금(만원), 미확인 시 null
  date: string; // 기록일 (ISO)
}

/** youth.rewards 적립 내역 항목 (localStorage 계약) */
export interface RewardHistoryItem {
  reason: string;
  points: number;
  date: string;
}

/** youth.rewards 상태 (localStorage 계약) */
export interface RewardsState {
  points: number;
  history: RewardHistoryItem[];
}

const WALLET_KEY = "youth.wallet";
const REWARDS_KEY = "youth.rewards";
/** 보상이 새로 지급될 때 발행되는 이벤트 (토스트 표시용) */
const REWARD_GRANT_EVENT = "youth:reward-granted";
/** youth.rewards 값이 바뀔 때 발행되는 이벤트 (훅 동기화용) */
const REWARDS_CHANGED_EVENT = "youth:rewards-changed";

export const STATUS_LABEL: Record<WalletStatus, string> = {
  interested: "📂 관심",
  applied: "📝 신청중",
  received: "🎉 수령완료",
};

/** 활동 보상 규칙 — 이윤호 브랜치 rewards 시드 데이터 이식 (1회성 배지) */
export const REWARD_RULES = [
  {
    code: "first_policy_apply",
    name: "첫 정책 신청",
    description: "첫 정책을 신청했어요",
    icon: "🚀",
    points: 100,
  },
  {
    code: "five_policies_applied",
    name: "5개 정책 신청",
    description: "5개의 정책을 신청했어요",
    icon: "⭐",
    points: 500,
  },
  {
    code: "documents_prepared",
    name: "서류 준비 완료",
    description: "필요 서류를 모두 준비했어요",
    icon: "📄",
    points: 200,
  },
  {
    code: "asset_formation_started",
    name: "자산 형성 시작",
    description: "자산 형성 정책을 시작했어요",
    icon: "💎",
    points: 300,
  },
  {
    code: "joined_community",
    name: "커뮤니티 참여",
    description: "후기·QnA 등 커뮤니티 활동을 시작했어요",
    icon: "👥",
    points: 50,
  },
] as const;

export type RewardCode = (typeof REWARD_RULES)[number]["code"];

/* ------------------------------------------------------------------ */
/* 지갑 (youth.wallet)                                                  */
/* ------------------------------------------------------------------ */

export function loadWallet(): WalletEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    return raw ? (JSON.parse(raw) as WalletEntry[]) : [];
  } catch {
    return [];
  }
}

function saveWallet(entries: WalletEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WALLET_KEY, JSON.stringify(entries));
}

/* ------------------------------------------------------------------ */
/* 리워드 (youth.rewards)                                               */
/* ------------------------------------------------------------------ */

export function loadRewards(): RewardsState {
  if (typeof window === "undefined") return { points: 0, history: [] };
  try {
    const raw = localStorage.getItem(REWARDS_KEY);
    if (!raw) return { points: 0, history: [] };
    const parsed = JSON.parse(raw) as Partial<RewardsState>;
    return {
      points: typeof parsed.points === "number" ? parsed.points : 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { points: 0, history: [] };
  }
}

function saveRewards(state: RewardsState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REWARDS_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(REWARDS_CHANGED_EVENT));
}

/** 레벨 계산: 1000점당 1레벨 (이윤호 로직 동일) */
export function rewardLevel(points: number): number {
  return Math.floor(points / 1000) + 1;
}

/** 포인트 적립 (같은 사유 중복 허용 — 일반 활동 보상용) */
export function addRewardPoints(reason: string, points: number): void {
  if (typeof window === "undefined") return;
  const state = loadRewards();
  saveRewards({
    points: state.points + points,
    history: [
      { reason, points, date: new Date().toISOString() },
      ...state.history,
    ],
  });
}

/** 해당 배지를 이미 획득했는지 (적립 내역의 사유로 판정) */
export function hasReward(state: RewardsState, code: RewardCode): boolean {
  const rule = REWARD_RULES.find((r) => r.code === code);
  if (!rule) return false;
  return state.history.some((h) => h.reason === rule.name);
}

/** 1회성 배지 보상 지급. 이미 지급된 경우 false */
export function grantReward(code: RewardCode): boolean {
  if (typeof window === "undefined") return false;
  const rule = REWARD_RULES.find((r) => r.code === code);
  if (!rule) return false;
  const state = loadRewards();
  if (hasReward(state, code)) return false;
  saveRewards({
    points: state.points + rule.points,
    history: [
      { reason: rule.name, points: rule.points, date: new Date().toISOString() },
      ...state.history,
    ],
  });
  window.dispatchEvent(
    new CustomEvent(REWARD_GRANT_EVENT, {
      detail: { name: rule.name, points: rule.points, icon: rule.icon },
    }),
  );
  return true;
}

/* ------------------------------------------------------------------ */
/* 훅                                                                   */
/* ------------------------------------------------------------------ */

/** 지갑(정책 신청/수령 기록) 훅 — localStorage 동기화 + 신청 마일스톤 보상 */
export function useWallet() {
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(loadWallet());
    setLoaded(true);
  }, []);

  const persist = (next: WalletEntry[]) => {
    setEntries(next);
    saveWallet(next);
  };

  /** 신청(신청중/수령완료) 건수 기반 마일스톤 배지 지급 */
  const checkMilestones = (next: WalletEntry[]) => {
    const activeCount = next.filter(
      (e) => e.status === "applied" || e.status === "received",
    ).length;
    if (activeCount >= 1) grantReward("first_policy_apply");
    if (activeCount >= 5) grantReward("five_policies_applied");
  };

  /** 지갑에 정책 추가 (이미 있으면 무시) */
  const add = (entry: Omit<WalletEntry, "date"> & { date?: string }) => {
    if (entries.some((e) => e.policyId === entry.policyId)) return;
    const next: WalletEntry[] = [
      { ...entry, date: entry.date ?? new Date().toISOString() },
      ...entries,
    ];
    persist(next);
    checkMilestones(next);
  };

  /** 신청 현황 변경 */
  const setStatus = (policyId: string, status: WalletStatus) => {
    const next = entries.map((e) =>
      e.policyId === policyId ? { ...e, status } : e,
    );
    persist(next);
    checkMilestones(next);
  };

  /** 지원금(만원) 수정 */
  const setAmount = (policyId: string, amount: number | null) => {
    persist(
      entries.map((e) => (e.policyId === policyId ? { ...e, amount } : e)),
    );
  };

  /** 지갑에서 제거 */
  const remove = (policyId: string) => {
    persist(entries.filter((e) => e.policyId !== policyId));
  };

  const has = (policyId: string) =>
    entries.some((e) => e.policyId === policyId);

  const totalReceived = entries
    .filter((e) => e.status === "received")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const interestedCount = entries.filter((e) => e.status === "interested").length;
  const appliedCount = entries.filter((e) => e.status === "applied").length;
  const receivedCount = entries.filter((e) => e.status === "received").length;

  return {
    entries,
    loaded,
    add,
    setStatus,
    setAmount,
    remove,
    has,
    totalReceived,
    interestedCount,
    appliedCount,
    receivedCount,
  };
}

/** 리워드(포인트/적립 내역) 훅 — 다른 탭·컴포넌트 변경도 이벤트로 동기화 */
export function useRewards() {
  const [state, setState] = useState<RewardsState>({ points: 0, history: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(loadRewards());
    setLoaded(true);
    const onChange = () => setState(loadRewards());
    window.addEventListener(REWARDS_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(REWARDS_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return {
    loaded,
    points: state.points,
    level: rewardLevel(state.points),
    history: state.history,
    earned: (code: RewardCode) => hasReward(state, code),
  };
}

/** 보상 지급 순간 토스트 표시용 훅 (지급 이벤트 구독) */
export function useRewardToast() {
  const [toast, setToast] = useState<{
    name: string;
    points: number;
    icon: string;
  } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onGrant = (e: Event) => {
      const detail = (
        e as CustomEvent<{ name: string; points: number; icon: string }>
      ).detail;
      if (!detail) return;
      setToast(detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener(REWARD_GRANT_EVENT, onGrant);
    return () => {
      window.removeEventListener(REWARD_GRANT_EVENT, onGrant);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return toast;
}
