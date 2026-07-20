"use client";

import { useState, useEffect } from "react";

const CATEGORIES = ["일자리", "주거", "교육", "복지문화", "참여권리"];
const FREQUENCIES = [
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
];

interface Subscription {
  email: string;
  categories: string[] | null;
  frequency: string;
  subscribed: boolean;
}

export function NewsletterSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/newsletter/subscribe")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.subscription) {
          setSubscription(data.subscription);
          setSelectedCategories(data.subscription.categories || []);
          setFrequency(data.subscription.frequency || "weekly");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const save = async (subscribed: boolean) => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          frequency,
          subscribed,
        }),
      });

      if (!response.ok) throw new Error("구독 설정에 실패했습니다");

      const data = await response.json();
      setSubscription(data.subscription);
      setMessage(subscribed ? "구독이 설정되었습니다" : "구독이 취소되었습니다");
    } catch {
      setMessage("오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">불러오는 중...</p>;
  }

  const isSubscribed = subscription?.subscribed ?? false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">📧 뉴스레터 구독</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isSubscribed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {isSubscribed ? "구독 중" : "구독 안 함"}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        관심 카테고리의 새 정책 소식을 받아보세요
      </p>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">관심 카테고리</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedCategories.includes(cat)
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-violet-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">수신 빈도</p>
        <div className="flex gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                frequency === f.value
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-violet-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {message && <p className="mt-4 text-sm text-violet-600">{message}</p>}

      <div className="mt-5 flex gap-2">
        {isSubscribed ? (
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            구독 취소
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => save(true)}
          disabled={saving}
          className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : isSubscribed ? "설정 저장" : "구독하기"}
        </button>
      </div>
    </div>
  );
}
