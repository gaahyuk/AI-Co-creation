"use client";

import { useState, useEffect } from "react";
import { formatManwon } from "@/lib/format";

interface StoryItem {
  id: string;
  title: string;
  content: string;
  receivedAmount: number | null;
  daysToReceive: number | null;
  helpful: number;
  createdAt: string;
  user: {
    email: string;
  };
}

interface StoriesData {
  stories: StoryItem[];
  count: number;
  avgAmount: number;
  avgDays: number;
}

export function PolicySuccessStories({ policyId }: { policyId: string }) {
  const [data, setData] = useState<StoriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [daysToReceive, setDaysToReceive] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchStories = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/success-stories`);
      if (response.ok) {
        setData(await response.json());
      }
    } catch (err) {
      console.error("Failed to fetch success stories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [policyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/policies/${policyId}/success-stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          receivedAmount: receivedAmount ? parseInt(receivedAmount, 10) : null,
          daysToReceive: daysToReceive ? parseInt(daysToReceive, 10) : null,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "후기 등록에 실패했습니다");
      }

      setTitle("");
      setContent("");
      setReceivedAmount("");
      setDaysToReceive("");
      setFormOpen(false);
      await fetchStories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-500">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 요약 통계 */}
      {data && data.count > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-50 p-4 text-center">
            <p className="text-sm text-emerald-600">평균 수령액</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">
              {formatManwon(data.avgAmount)}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-sm text-blue-600">평균 소요 기간</p>
            <p className="mt-1 text-xl font-bold text-blue-900">
              {data.avgDays > 0 ? `${data.avgDays}일` : "-"}
            </p>
          </div>
        </div>
      )}

      {/* 후기 작성 토글 */}
      {!formOpen ? (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="w-full rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          🎉 나도 성공 후기 남기기
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 3개월 만에 300만원 받았어요!"
              maxLength={100}
              className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">상세 후기</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="신청 과정과 팁을 공유해주세요"
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                받은 금액 (원, 선택)
              </label>
              <input
                type="number"
                min={0}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="3000000"
                className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                소요 기간 (일, 선택)
              </label>
              <input
                type="number"
                min={0}
                value={daysToReceive}
                onChange={(e) => setDaysToReceive(e.target.value)}
                placeholder="90"
                className="w-full rounded-lg border border-emerald-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-white"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "등록 중..." : "후기 등록"}
            </button>
          </div>
        </form>
      )}

      {/* 후기 목록 */}
      {data && data.count > 0 ? (
        <div className="space-y-3">
          {data.stories.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-bold text-slate-900">{s.title}</h4>
              <p className="mt-2 text-sm text-slate-700">{s.content}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {s.receivedAmount != null && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-700">
                    💰 {formatManwon(s.receivedAmount)}
                  </span>
                )}
                {s.daysToReceive != null && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700">
                    ⏱️ {s.daysToReceive}일 소요
                  </span>
                )}
                <span className="text-slate-400">
                  {s.user.email.split("@")[0]} ·{" "}
                  {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-slate-500">
          아직 성공 후기가 없습니다. 첫 후기의 주인공이 되어보세요!
        </p>
      )}
    </div>
  );
}
