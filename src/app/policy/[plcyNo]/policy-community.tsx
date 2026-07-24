"use client";

// 정책 상세 하단 커뮤니티 영역 — 제보 패널 + 공유 + (후기/QnA/성공사례) 탭 컨테이너

import { useState } from "react";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import styles from "./community.module.css";
import PolicyTips from "./policy-tips";
import PolicyShare from "./policy-share";
import PolicyReviews from "./policy-reviews";
import PolicyQna from "./policy-qna";
import PolicyStories from "./policy-stories";

type TabKey = "reviews" | "qna" | "stories";

const TABS: { key: TabKey; label: string }[] = [
  { key: "reviews", label: "후기" },
  { key: "qna", label: "QnA" },
  { key: "stories", label: "성공사례" },
];

export default function PolicyCommunity({ policy }: { policy: PolicyWithEligibility }) {
  const [tab, setTab] = useState<TabKey>("reviews");

  return (
    <>
      {/* 실시간 익명 제보 (신청 팁) */}
      <PolicyTips plcyNo={policy.id} />

      {/* 공유하기 */}
      <PolicyShare plcyNo={policy.id} name={policy.name} amount={policy.amount} />

      {/* 후기 / QnA / 성공사례 탭 */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>
          💬 함께 나누는 정책 이야기
        </h3>
        <div className={styles.commTabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.commTab} ${tab === t.key ? styles.commTabActive : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "reviews" && <PolicyReviews plcyNo={policy.id} />}
        {tab === "qna" && <PolicyQna plcyNo={policy.id} />}
        {tab === "stories" && <PolicyStories plcyNo={policy.id} />}
      </div>
    </>
  );
}
