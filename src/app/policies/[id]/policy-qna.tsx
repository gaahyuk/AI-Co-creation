"use client";

import { useState, useEffect } from "react";

interface QnAItem {
  id: string;
  question: string;
  answer: string | null;
  votes: number;
  createdAt: string;
  user: {
    email: string;
  };
}

interface QnAData {
  qna: QnAItem[];
  count: number;
}

export function PolicyQnA({ policyId }: { policyId: string }) {
  const [data, setData] = useState<QnAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchQnA = async () => {
    try {
      const response = await fetch(`/api/policies/${policyId}/qna`);
      if (response.ok) {
        setData(await response.json());
      }
    } catch (err) {
      console.error("Failed to fetch Q&A:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQnA();
  }, [policyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/policies/${policyId}/qna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "질문 등록에 실패했습니다");
      }

      setNewQuestion("");
      await fetchQnA();
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
      {/* 질문 작성 폼 */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <label className="block text-sm font-medium text-slate-700">
          궁금한 점을 질문해보세요
        </label>
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="예: 소득 증빙은 어떤 서류로 하나요?"
          maxLength={500}
          className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          rows={2}
        />
        <p className="text-xs text-slate-500">{newQuestion.length}/500</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !newQuestion.trim()}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "질문 등록하기"}
        </button>
      </form>

      {/* Q&A 목록 */}
      {data && data.count > 0 ? (
        <div className="space-y-3">
          {data.qna.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-sm font-bold text-blue-600">Q.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.question}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.user.email.split("@")[0]} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>

              {item.answer ? (
                <div className="mt-3 flex items-start gap-2 border-t border-slate-200 pt-3">
                  <span className="mt-0.5 text-sm font-bold text-emerald-600">A.</span>
                  <p className="flex-1 text-sm text-slate-700">{item.answer}</p>
                </div>
              ) : (
                <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-400">
                  아직 답변이 등록되지 않았습니다
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-slate-500">
          아직 질문이 없습니다. 첫 질문을 남겨보세요!
        </p>
      )}
    </div>
  );
}
