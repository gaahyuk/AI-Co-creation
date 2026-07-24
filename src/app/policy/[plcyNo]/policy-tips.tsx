"use client";

// 실시간 익명 제보(신청 팁) 패널 — 이윤호 브랜치 policy-tip-panel 포팅
// 유형(TIP_TYPES) 정적 규칙 기반, 저장 위치: localStorage youth.tips.<plcyNo>

import { useState } from "react";
import styles from "./community.module.css";
import {
  type TipItem,
  TIP_TYPES,
  URGENT_TIP_TYPES,
  tipTypeInfo,
  useLocalList,
  newId,
  timeAgoKo,
} from "./community-storage";

const MAX_TIPS = 20; // 원본과 동일하게 최근 20건만 유지

export default function PolicyTips({ plcyNo }: { plcyNo: string }) {
  const { items: tips, loaded, update } = useLocalList<TipItem>(`youth.tips.${plcyNo}`);
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [tipType, setTipType] = useState<string>("general");
  const [error, setError] = useState<string | null>(null);

  const urgentCount = tips.filter((t) => URGENT_TIP_TYPES.includes(t.tipType)).length;

  const addTip = () => {
    setError(null);
    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 200) {
      setError("제보 내용을 1~200자로 입력해주세요.");
      return;
    }
    const tip: TipItem = {
      id: newId(),
      content: trimmed,
      tipType,
      createdAt: new Date().toISOString(),
    };
    update([tip, ...tips].slice(0, MAX_TIPS));
    setContent("");
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button
        type="button"
        className={styles.tipToggle}
        onClick={() => setExpanded((v) => !v)}
      >
        💬 실시간 익명 제보 {expanded ? "접기" : "보기"}
        {!expanded && urgentCount > 0 && (
          <span className={styles.tipUrgent}>(주의 제보 {urgentCount}건)</span>
        )}
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <div className={styles.tipList}>
            {!loaded || tips.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--text-sub)" }}>
                아직 제보가 없어요.
              </span>
            ) : (
              tips.map((tip) => {
                const info = tipTypeInfo(tip.tipType);
                return (
                  <div key={tip.id} className={styles.tipRow}>
                    <span>{info.icon}</span>
                    <span className={styles.tipContent}>{tip.content}</span>
                    <span className={styles.tipTime}>{timeAgoKo(tip.createdAt)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.tipForm}>
            <select
              className={styles.tipSelect}
              value={tipType}
              onChange={(e) => setTipType(e.target.value)}
            >
              {TIP_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
            <input
              className={styles.tipInput}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={200}
              placeholder="예: 지금 사이트 접속이 안 돼요"
            />
            <button
              type="button"
              className={styles.tipSubmit}
              disabled={content.trim().length === 0}
              onClick={addTip}
            >
              등록
            </button>
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <p className={styles.tipNote}>
            작성자는 표시되지 않는 완전 익명 제보예요. 서로 도움이 되는 정보만
            남겨주세요.
          </p>
        </div>
      )}
    </div>
  );
}
