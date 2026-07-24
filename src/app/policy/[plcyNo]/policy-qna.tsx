"use client";

// 정책 QnA — 질문 등록/답변 (이윤호 브랜치 policy-qna 포팅)
// 저장 위치: localStorage youth.qna.<plcyNo>

import { useState } from "react";
import styles from "./community.module.css";
import {
  type QnaItem,
  useLocalList,
  newId,
  loadAccountName,
} from "./community-storage";
import { grantReward } from "@/lib/wallet";

export default function PolicyQna({ plcyNo }: { plcyNo: string }) {
  const { items: qna, loaded, update } = useLocalList<QnaItem>(`youth.qna.${plcyNo}`);
  const [newQuestion, setNewQuestion] = useState("");
  const [answeringTo, setAnsweringTo] = useState<string | null>(null);
  const [answerContent, setAnswerContent] = useState("");

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const item: QnaItem = {
      id: newId(),
      question: newQuestion.trim(),
      answer: null,
      author: loadAccountName(),
      createdAt: new Date().toISOString(),
      answeredAt: null,
    };
    // 최신 질문이 위로
    update([item, ...qna]);
    // 후기·QnA·성공사례 등 커뮤니티 활동 최초 참여 시 배지 지급
    grantReward("joined_community");
    setNewQuestion("");
  };

  const addAnswer = (id: string) => {
    if (!answerContent.trim()) return;
    update(
      qna.map((q) =>
        q.id === id
          ? { ...q, answer: answerContent.trim(), answeredAt: new Date().toISOString() }
          : q
      )
    );
    setAnsweringTo(null);
    setAnswerContent("");
  };

  const remove = (id: string) => {
    if (!window.confirm("이 질문을 삭제할까요?")) return;
    update(qna.filter((q) => q.id !== id));
  };

  if (!loaded) return <div className={styles.emptyText}>불러오는 중…</div>;

  return (
    <div>
      {/* 질문 작성 폼 */}
      <div className={styles.formCard}>
        <label className={styles.inputLabel}>궁금한 점을 질문해보세요</label>
        <textarea
          className={styles.textArea}
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="예: 소득 증빙은 어떤 서류로 하나요?"
          maxLength={500}
          rows={2}
        />
        <p className={styles.charCount}>{newQuestion.length}/500</p>
        <button
          className="btn small"
          style={{ width: "100%" }}
          disabled={!newQuestion.trim()}
          onClick={addQuestion}
        >
          질문 등록하기
        </button>
      </div>

      {/* QnA 목록 */}
      {qna.length === 0 ? (
        <p className={styles.emptyText}>아직 질문이 없어요. 첫 질문을 남겨보세요!</p>
      ) : (
        qna.map((item) => (
          <div key={item.id} className={styles.itemCard}>
            <div className={styles.qnaRow}>
              <span className={styles.qnaMarkQ}>Q.</span>
              <div style={{ flex: 1 }}>
                <p className={styles.itemContent} style={{ margin: 0, fontWeight: 600 }}>
                  {item.question}
                </p>
                <div style={{ marginTop: 4 }}>
                  <span className={styles.itemDate}>
                    {item.author} · {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </div>
              <button className={styles.deleteBtn} onClick={() => remove(item.id)}>
                삭제
              </button>
            </div>

            {item.answer ? (
              <div className={`${styles.qnaRow} ${styles.qnaAnswer}`}>
                <span className={styles.qnaMarkA}>A.</span>
                <p className={styles.itemContent} style={{ margin: 0, flex: 1 }}>
                  {item.answer}
                </p>
              </div>
            ) : answeringTo === item.id ? (
              <div className={styles.replyForm}>
                <input
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  placeholder="아는 내용을 답변으로 남겨주세요…"
                  maxLength={500}
                />
                <button
                  className="btn small"
                  disabled={!answerContent.trim()}
                  onClick={() => addAnswer(item.id)}
                >
                  등록
                </button>
              </div>
            ) : (
              <div className={styles.qnaNoAnswer}>
                아직 답변이 등록되지 않았어요.{" "}
                <button
                  className={styles.actionBtn}
                  style={{ textDecoration: "underline" }}
                  onClick={() => {
                    setAnsweringTo(item.id);
                    setAnswerContent("");
                  }}
                >
                  답변 달기
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
