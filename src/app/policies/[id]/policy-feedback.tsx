"use client";

import { useState, useEffect } from "react";

interface FeedbackItem {
  id: string;
  content: string;
  rating: number | null;
  helpful: number;
  createdAt: string;
  user: {
    email: string;
  };
}

interface FeedbackData {
  feedback: FeedbackItem[];
  count: number;
  avgRating: number;
}

export function PolicyFeedback({ policyId }: { policyId: string }) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await fetch(
          `/api/policies/${policyId}/feedback`
        );
        if (response.ok) {
          const data = await response.json();
          setFeedback(data);
        }
      } catch (error) {
        console.error("Failed to fetch feedback:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [policyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/policies/${policyId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent, rating }),
        }
      );

      if (response.ok) {
        setNewContent("");
        setRating(5);
        // 피드백 다시 로드
        const refreshResponse = await fetch(
          `/api/policies/${policyId}/feedback`
        );
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setFeedback(data);
        }
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-500">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 평균 평점 */}
      {feedback && feedback.count > 0 && (
        <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600">평균 평점</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl font-bold text-amber-900">
                  {feedback.avgRating}
                </span>
                <span className="text-2xl">
                  {"⭐".repeat(Math.round(feedback.avgRating))}
                </span>
              </div>
            </div>
            <p className="text-right text-sm text-amber-700">
              총 {feedback.count}개 후기
            </p>
          </div>
        </div>
      )}

      {/* 피드백 작성 폼 */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            평점
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl transition-transform ${
                  rating >= star ? "scale-110" : "opacity-30"
                }`}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            후기 작성
          </label>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="이 정책에 대한 후기를 작성해주세요 (최대 500자)"
            maxLength={500}
            className="w-full rounded-lg border border-violet-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none"
            rows={3}
          />
          <p className="mt-1 text-xs text-slate-500">
            {newContent.length}/500
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !newContent.trim()}
          className="w-full rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {submitting ? "작성 중..." : "후기 작성하기"}
        </button>
      </form>

      {/* 피드백 목록 */}
      {feedback && feedback.count > 0 ? (
        <div className="space-y-3">
          {feedback.feedback.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {item.rating && (
                      <span>{"⭐".repeat(item.rating)}</span>
                    )}
                    <p className="text-xs text-slate-500">
                      {item.user.email.split("@")[0]}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-900">
                    {item.content}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {new Date(item.createdAt).toLocaleDateString("ko-KR")}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-500 py-4">
          아직 후기가 없습니다. 첫 후기를 작성해주세요!
        </p>
      )}
    </div>
  );
}
