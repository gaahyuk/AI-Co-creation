"use client";

// 정책 후기 — 별점 + 텍스트, 좋아요/답글/삭제 (장재영 브랜치 리뷰 기능 포팅)
// 저장 위치: localStorage youth.reviews.<plcyNo>

import { useState } from "react";
import styles from "./community.module.css";
import {
  type ReviewItem,
  useLocalList,
  newId,
  loadAccountName,
} from "./community-storage";
import { grantReward } from "@/lib/wallet";

function Stars({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className={styles.starText}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

export default function PolicyReviews({ plcyNo }: { plcyNo: string }) {
  const { items: reviews, loaded, update } = useLocalList<ReviewItem>(
    `youth.reviews.${plcyNo}`
  );
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const roots = reviews.filter((r) => !r.parentId);
  const rated = roots.filter((r) => r.rating > 0);
  const avg =
    rated.length > 0
      ? Math.round((rated.reduce((s, r) => s + r.rating, 0) / rated.length) * 10) / 10
      : 0;

  const addReview = (text: string, parentId: string | null) => {
    if (!text.trim()) return;
    const item: ReviewItem = {
      id: newId(),
      rating: parentId ? 0 : rating,
      content: text.trim(),
      author: loadAccountName(),
      likes: 0,
      likedByMe: false,
      parentId,
      createdAt: new Date().toISOString(),
    };
    update([...reviews, item]);
    // 후기·QnA·성공사례 등 커뮤니티 활동 최초 참여 시 배지 지급
    grantReward("joined_community");
    if (parentId) {
      setReplyingTo(null);
      setReplyContent("");
    } else {
      setContent("");
      setRating(5);
    }
  };

  const toggleLike = (id: string) => {
    update(
      reviews.map((r) =>
        r.id === id
          ? {
              ...r,
              likedByMe: !r.likedByMe,
              likes: Math.max(0, r.likes + (r.likedByMe ? -1 : 1)),
            }
          : r
      )
    );
  };

  const remove = (id: string) => {
    if (!window.confirm("이 후기(및 답글)를 삭제할까요?")) return;
    update(reviews.filter((r) => r.id !== id && r.parentId !== id));
  };

  if (!loaded) return <div className={styles.emptyText}>불러오는 중…</div>;

  return (
    <div>
      {/* 평균 별점 */}
      {rated.length > 0 && (
        <div className={styles.avgCard}>
          <div>
            <div className={styles.avgLabel}>평균 별점</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={styles.avgScore}>{avg}</span>
              <Stars n={Math.round(avg)} />
            </div>
          </div>
          <span className={styles.avgCount}>후기 {roots.length}개</span>
        </div>
      )}

      {/* 후기 작성 폼 */}
      <div className={styles.formCard}>
        <label className={styles.inputLabel}>별점</label>
        <div className={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${styles.starBtn} ${rating >= star ? styles.starOn : ""}`}
              onClick={() => setRating(star)}
              aria-label={`${star}점`}
            >
              ★
            </button>
          ))}
        </div>
        <label className={styles.inputLabel}>후기 작성</label>
        <textarea
          className={styles.textArea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="이 정책에 대한 수혜 후기나 기대평을 자유롭게 남겨보세요 (최대 500자)"
          maxLength={500}
          rows={3}
        />
        <p className={styles.charCount}>{content.length}/500</p>
        <button
          className="btn small"
          style={{ width: "100%" }}
          disabled={!content.trim()}
          onClick={() => addReview(content, null)}
        >
          후기 등록하기
        </button>
      </div>

      {/* 후기 목록 */}
      {roots.length === 0 ? (
        <p className={styles.emptyText}>
          아직 등록된 후기가 없어요. 첫 번째 후기를 남겨보세요!
        </p>
      ) : (
        roots.map((review) => {
          const replies = reviews.filter((r) => r.parentId === review.id);
          return (
            <div key={review.id} className={styles.itemCard}>
              <div className={styles.itemHead}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={styles.itemAuthor}>{review.author}</span>
                  <span className={styles.itemDate}>
                    {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <button className={styles.deleteBtn} onClick={() => remove(review.id)}>
                  삭제
                </button>
              </div>
              <Stars n={review.rating} />
              <p className={styles.itemContent}>{review.content}</p>
              <div className={styles.itemActions}>
                <button
                  className={`${styles.actionBtn} ${review.likedByMe ? styles.likeOn : ""}`}
                  onClick={() => toggleLike(review.id)}
                >
                  👍 {review.likes}
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={() => {
                    setReplyingTo(replyingTo === review.id ? null : review.id);
                    setReplyContent("");
                  }}
                >
                  💬 답글 달기
                </button>
              </div>

              {/* 답글 입력 */}
              {replyingTo === review.id && (
                <div className={styles.replyForm}>
                  <input
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="답글을 남겨주세요…"
                    maxLength={300}
                  />
                  <button
                    className="btn small"
                    disabled={!replyContent.trim()}
                    onClick={() => addReview(replyContent, review.id)}
                  >
                    등록
                  </button>
                </div>
              )}

              {/* 답글 목록 */}
              {replies.length > 0 && (
                <div className={styles.replyList}>
                  {replies.map((reply) => (
                    <div key={reply.id} className={styles.replyItem}>
                      <div className={styles.itemHead}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className={styles.itemAuthor}>{reply.author}</span>
                          <span className={styles.itemDate}>
                            {new Date(reply.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => remove(reply.id)}
                        >
                          삭제
                        </button>
                      </div>
                      <p className={styles.itemContent}>{reply.content}</p>
                      <div className={styles.itemActions}>
                        <button
                          className={`${styles.actionBtn} ${reply.likedByMe ? styles.likeOn : ""}`}
                          onClick={() => toggleLike(reply.id)}
                        >
                          👍 {reply.likes}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
