"use client";

import { useEffect, useState } from "react";
import { TIP_TYPES, tipTypeInfo } from "@/lib/constants";
import { timeAgoKo } from "@/lib/time-ago";

type Tip = {
  id: string;
  content: string;
  tipType: string;
  createdAt: string;
};

const POLL_INTERVAL_MS = 5000;

export function PolicyTipPanel({
  policyId,
  initialUrgentCount,
}: {
  policyId: string;
  initialUrgentCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [content, setContent] = useState("");
  const [tipType, setTipType] = useState<string>("general");
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;

    async function fetchTips() {
      try {
        const res = await fetch(`/api/policies/${policyId}/tips`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setTips(data.tips);
      } catch {
        // 폴링 실패는 조용히 무시하고 다음 주기에 재시도
      }
    }

    fetchTips();
    const interval = setInterval(fetchTips, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [expanded, policyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPosting(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/tips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tipType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "제보 등록에 실패했습니다.");
        return;
      }
      setTips((prev) => [data.tip, ...prev]);
      setContent("");
    } catch {
      setError("제보 등록에 실패했습니다.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-gray-500 underline"
      >
        💬 실시간 익명 제보 {expanded ? "접기" : "보기"}
        {!expanded && initialUrgentCount > 0 && (
          <span className="ml-1 text-red-600">(주의 제보 {initialUrgentCount}건)</span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs">
            {tips.length === 0 && <li className="text-gray-400">아직 제보가 없습니다.</li>}
            {tips.map((tip) => {
              const info = tipTypeInfo(tip.tipType);
              return (
                <li key={tip.id} className="flex gap-1">
                  <span>{info.icon}</span>
                  <span className="flex-1">{tip.content}</span>
                  <span className="whitespace-nowrap text-gray-400">
                    {timeAgoKo(new Date(tip.createdAt))}
                  </span>
                </li>
              );
            })}
          </ul>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            <div className="flex gap-1">
              <select
                value={tipType}
                onChange={(e) => setTipType(e.target.value)}
                className="rounded border border-gray-300 text-xs"
              >
                {TIP_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={200}
                placeholder="예: 지금 사이트 접속이 안 돼요"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
              />
              <button
                type="submit"
                disabled={posting || content.trim().length === 0}
                className="rounded bg-gray-800 px-2 py-1 text-xs text-white disabled:opacity-40"
              >
                등록
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <p className="text-[10px] text-gray-400">
              작성자는 표시되지 않는 완전 익명 제보입니다. 서로 도움이 되는 정보만 남겨주세요.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
