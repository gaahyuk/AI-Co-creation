"use client";

// 성공사례 — 제목/내용/받은 금액/소요 기간 + 평균 통계 (이윤호 브랜치 success-stories 포팅)
// 저장 위치: localStorage youth.stories.<plcyNo>

import { useState } from "react";
import styles from "./community.module.css";
import { formatManwon } from "@/lib/format";
import {
  type StoryItem,
  useLocalList,
  newId,
  loadAccountName,
} from "./community-storage";
import { grantReward } from "@/lib/wallet";

export default function PolicyStories({ plcyNo }: { plcyNo: string }) {
  const { items: stories, loaded, update } = useLocalList<StoryItem>(
    `youth.stories.${plcyNo}`
  );
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [daysToReceive, setDaysToReceive] = useState("");

  // 평균 통계 (원본 API의 avgAmount / avgDays 계산 방식과 동일)
  const withAmount = stories.filter((s) => s.receivedAmount != null);
  const withDays = stories.filter((s) => s.daysToReceive != null);
  const avgAmount =
    withAmount.length > 0
      ? Math.round(
          withAmount.reduce((sum, s) => sum + (s.receivedAmount ?? 0), 0) /
            withAmount.length
        )
      : 0;
  const avgDays =
    withDays.length > 0
      ? Math.round(
          withDays.reduce((sum, s) => sum + (s.daysToReceive ?? 0), 0) / withDays.length
        )
      : 0;

  const addStory = () => {
    if (!title.trim() || !content.trim()) return;
    const amount = parseInt(receivedAmount, 10);
    const days = parseInt(daysToReceive, 10);
    const item: StoryItem = {
      id: newId(),
      title: title.trim(),
      content: content.trim(),
      receivedAmount: Number.isFinite(amount) && amount >= 0 ? amount : null,
      daysToReceive: Number.isFinite(days) && days >= 0 ? days : null,
      author: loadAccountName(),
      createdAt: new Date().toISOString(),
    };
    update([item, ...stories]);
    // 후기·QnA·성공사례 등 커뮤니티 활동 최초 참여 시 배지 지급
    grantReward("joined_community");
    setTitle("");
    setContent("");
    setReceivedAmount("");
    setDaysToReceive("");
    setFormOpen(false);
  };

  const remove = (id: string) => {
    if (!window.confirm("이 성공사례를 삭제할까요?")) return;
    update(stories.filter((s) => s.id !== id));
  };

  if (!loaded) return <div className={styles.emptyText}>불러오는 중…</div>;

  return (
    <div>
      {/* 요약 통계 */}
      {stories.length > 0 && (
        <div className={styles.statGrid}>
          <div className={`${styles.statBox} ${styles.statGreen}`}>
            <div className={styles.statLabel}>평균 수령액</div>
            <div className={styles.statValue}>
              {withAmount.length > 0 ? `약 ${formatManwon(avgAmount)}` : "-"}
            </div>
          </div>
          <div className={`${styles.statBox} ${styles.statBlue}`}>
            <div className={styles.statLabel}>평균 소요 기간</div>
            <div className={styles.statValue}>
              {withDays.length > 0 ? `${avgDays}일` : "-"}
            </div>
          </div>
        </div>
      )}

      {/* 작성 토글 / 폼 */}
      {!formOpen ? (
        <button
          type="button"
          className={styles.storyToggleBtn}
          onClick={() => setFormOpen(true)}
        >
          🎉 나도 성공 후기 남기기
        </button>
      ) : (
        <div className={styles.formCard}>
          <label className={styles.inputLabel}>제목</label>
          <input
            type="text"
            className={styles.textInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 3개월 만에 300만원 받았어요!"
            maxLength={100}
            style={{ marginBottom: 10 }}
          />
          <label className={styles.inputLabel}>상세 후기</label>
          <textarea
            className={styles.textArea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="신청 과정과 팁을 공유해주세요"
            maxLength={1000}
            rows={3}
            style={{ marginBottom: 10 }}
          />
          <div className={styles.formRow2}>
            <div>
              <label className={styles.inputLabel}>받은 금액 (만원, 선택)</label>
              <input
                type="number"
                min={0}
                className={styles.textInput}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="300"
              />
            </div>
            <div>
              <label className={styles.inputLabel}>소요 기간 (일, 선택)</label>
              <input
                type="number"
                min={0}
                className={styles.textInput}
                value={daysToReceive}
                onChange={(e) => setDaysToReceive(e.target.value)}
                placeholder="90"
              />
            </div>
          </div>
          <div className={styles.formBtns}>
            <button
              className="btn small secondary"
              style={{ flex: 1 }}
              onClick={() => setFormOpen(false)}
            >
              취소
            </button>
            <button
              className="btn small"
              style={{ flex: 1 }}
              disabled={!title.trim() || !content.trim()}
              onClick={addStory}
            >
              후기 등록
            </button>
          </div>
        </div>
      )}

      {/* 성공사례 목록 */}
      {stories.length === 0 ? (
        <p className={styles.emptyText}>
          아직 성공사례가 없어요. 첫 후기의 주인공이 되어보세요!
        </p>
      ) : (
        stories.map((s) => (
          <div key={s.id} className={styles.itemCard}>
            <div className={styles.itemHead}>
              <span className={styles.itemAuthor} style={{ fontSize: 14 }}>
                {s.title}
              </span>
              <button className={styles.deleteBtn} onClick={() => remove(s.id)}>
                삭제
              </button>
            </div>
            <p className={styles.itemContent}>{s.content}</p>
            <div className={styles.storyBadges}>
              {s.receivedAmount != null && (
                <span className="tag green">💰 {formatManwon(s.receivedAmount)}</span>
              )}
              {s.daysToReceive != null && (
                <span className="tag blue">⏱️ {s.daysToReceive}일 소요</span>
              )}
              <span className={styles.itemDate}>
                {s.author} · {new Date(s.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
