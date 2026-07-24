"use client";

// 정책 공유 — Web Share API + 클립보드 복사 폴백 (이윤호 브랜치 policy-share 포팅)

import { useState } from "react";
import styles from "./community.module.css";
import { formatManwon } from "@/lib/format";

export default function PolicyShare({
  plcyNo,
  name,
  amount,
}: {
  plcyNo: string;
  name: string;
  amount: number | null;
}) {
  const [copied, setCopied] = useState(false);

  const getUrl = () =>
    typeof window !== "undefined"
      ? `${window.location.origin}/policy/${plcyNo}`
      : `/policy/${plcyNo}`;

  const getText = () =>
    `${name} — ${amount !== null ? `약 ${formatManwon(amount)} 받을 수 있어요! ` : ""}청년정책 미니앱에서 확인해보세요.`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한이 없으면 조용히 무시
    }
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, text: getText(), url: getUrl() });
        return;
      } catch {
        // 사용자가 공유를 취소한 경우 등 — 폴백으로 링크 복사
      }
    }
    // Web Share 미지원 브라우저는 링크 복사로 폴백
    await copyLink();
  };

  const shareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getText())}&url=${encodeURIComponent(getUrl())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>📤 공유하기</h3>
      <div className={styles.shareGrid}>
        <button
          className={`${styles.shareBtn} ${styles.shareNative}`}
          onClick={nativeShare}
        >
          <span>📱</span> 공유하기
        </button>
        <button className={styles.shareBtn} onClick={copyLink}>
          <span>🔗</span> {copied ? "복사됨!" : "링크 복사"}
        </button>
        <button className={styles.shareBtn} onClick={shareTwitter}>
          <span>𝕏</span> 트위터에 공유
        </button>
        <button className={styles.shareBtn} onClick={shareFacebook}>
          <span>ⓕ</span> 페이스북에 공유
        </button>
      </div>
      <p className={styles.shareNote}>
        이 정책을 친구들과 공유하면 함께 신청할 수 있어요!
      </p>
    </div>
  );
}
