"use client";

import { useEffect, useState } from "react";

interface Review {
  id: string;
  plcyNo: string;
  author: string;
  rating: number;
  content: string;
  createdAt: string;
}

interface ReviewSectionProps {
  plcyNo: string;
}

export default function ReviewSection({ plcyNo }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?plcyNo=${plcyNo}`);
      if (!res.ok) {
        throw new Error("리뷰를 불러오는 데 실패했습니다.");
      }
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [plcyNo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plcyNo,
          author: author.trim(),
          rating,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "리뷰 작성에 실패했습니다.");
      }

      // Clear form and refetch
      setAuthor("");
      setRating(5);
      setContent("");
      await fetchReviews();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="card" style={{ marginTop: 24, padding: 18 }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700 }}>시민 리뷰 ({reviews.length})</h3>

      {/* Review Summary Score */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 16px",
          background: "var(--bg)",
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{averageRating}</div>
        <div>
          <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                style={{
                  color: star <= Math.round(Number(averageRating)) ? "#FFB800" : "#E5E8EB",
                  fontSize: 16,
                }}
              >
                ★
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-sub)" }}>5점 만점 기준</div>
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-sub)", fontSize: 14 }}>
          불러오는 중…
        </div>
      ) : error ? (
        <div style={{ color: "var(--red)", fontSize: 13, padding: "8px 0" }}>{error}</div>
      ) : reviews.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "var(--text-sub)",
            fontSize: 14,
            borderBottom: "1px solid var(--border)",
            marginBottom: 20,
          }}
        >
          아직 리뷰가 없어요. 첫 리뷰를 작성해보세요! 💬
        </div>
      ) : (
        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            marginBottom: 20,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {reviews.map((review) => (
            <div
              key={review.id}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid #f2f4f6",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{review.author}</span>
                  <div style={{ display: "flex", gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        style={{
                          color: star <= review.rating ? "#FFB800" : "#E5E8EB",
                          fontSize: 11,
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-sub)" }}>{formatDate(review.createdAt)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "#333d4b" }}>{review.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Review Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h4 style={{ margin: "8px 0 0 0", fontSize: 14, fontWeight: 700 }}>리뷰 남기기</h4>
        
        {/* Star Rating Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--text-sub)" }}>별점 선택:</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 22,
                  color: star <= rating ? "#FFB800" : "#E5E8EB",
                  transition: "transform 0.1s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Nickname input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            type="text"
            placeholder="닉네임"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            maxLength={20}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13,
              outline: "none",
              background: "#fff",
            }}
          />
        </div>

        {/* Content input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <textarea
            placeholder="정책에 대한 유용한 후기나 팁을 공유해주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={500}
            rows={3}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 13,
              lineHeight: 1.5,
              outline: "none",
              resize: "none",
              background: "#fff",
            }}
          />
        </div>

        {submitError && (
          <div style={{ color: "var(--red)", fontSize: 12 }}>{submitError}</div>
        )}

        <button
          type="submit"
          disabled={submitting || !author.trim() || !content.trim()}
          style={{
            padding: "12px",
            borderRadius: 8,
            border: "none",
            background: "var(--toss-blue)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          {submitting ? "등록 중..." : "리뷰 등록"}
        </button>
      </form>
    </div>
  );
}
