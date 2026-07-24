"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

// 로컬 데이터 관리 — 원본(장재영 브랜치 admin의 정책 삭제, 이윤호 브랜치 delete-user-button)의
// DB 데이터 삭제를 localStorage 키별 조회/초기화로 이식.

/** youth.* 키 설명 (끝이 "."인 항목은 접두사 매칭) */
const KEY_DESCRIPTIONS: [string, string][] = [
  ["youth.profile", "내 정보(맞춤 조건)"],
  ["youth.bookmarks", "저장한 정책(별표)"],
  ["youth.account", "로컬 계정"],
  ["youth.diagnosis", "자가진단 결과"],
  ["youth.wallet", "정책 지갑 기록"],
  ["youth.rewards", "리워드 포인트"],
  ["youth.newsletter", "뉴스레터 구독"],
  ["youth.news.custom", "관리자 등록 뉴스"],
  ["youth.compare", "비교함 선택"],
  ["youth.docs.", "정책별 서류 체크리스트"],
  ["youth.reviews.", "정책별 후기"],
  ["youth.qna.", "정책별 QnA"],
  ["youth.stories.", "정책별 성공사례"],
];

function describeKey(key: string): string {
  for (const [pattern, desc] of KEY_DESCRIPTIONS) {
    if (pattern.endsWith(".") ? key.startsWith(pattern) : key === pattern) return desc;
  }
  return "기타 데이터";
}

interface KeyInfo {
  key: string;
  desc: string;
  count: number | null; // 배열이면 항목 수, 아니면 null
  size: number; // 저장 문자열 길이
}

function scanKeys(): KeyInfo[] {
  const result: KeyInfo[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("youth.")) continue;
    const raw = localStorage.getItem(key) ?? "";
    let count: number | null = null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) count = parsed.length;
    } catch {
      /* JSON이 아니어도 표시엔 문제 없음 */
    }
    result.push({ key, desc: describeKey(key), count, size: raw.length });
  }
  return result.sort((a, b) => a.key.localeCompare(b.key));
}

function formatSize(chars: number): string {
  // localStorage는 UTF-16 저장이므로 대략 2바이트/문자로 환산
  const bytes = chars * 2;
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${bytes}B`;
}

export default function StorageManager({ onChange }: { onChange?: () => void }) {
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setKeys(scanKeys());
    setLoaded(true);
  }, []);

  const refresh = () => {
    setKeys(scanKeys());
    onChange?.();
  };

  const handleRemove = (key: string, desc: string) => {
    if (!confirm(`"${desc}" (${key}) 데이터를 초기화할까요? 되돌릴 수 없어요.`)) return;
    localStorage.removeItem(key);
    refresh();
  };

  const handleRemoveAll = () => {
    if (
      !confirm(
        "이 브라우저의 앱 데이터(youth.*)를 전부 초기화할까요?\n프로필·계정·저장 정책·후기 등이 모두 삭제되며 되돌릴 수 없어요.",
      )
    )
      return;
    const targets: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("youth.")) targets.push(key);
    }
    targets.forEach((k) => localStorage.removeItem(k));
    refresh();
  };

  return (
    <>
      {!loaded ? (
        <div className="loading">불러오는 중…</div>
      ) : keys.length === 0 ? (
        <div className="empty" style={{ padding: "24px 0" }}>
          저장된 로컬 데이터가 없어요.
        </div>
      ) : (
        <>
          {keys.map((k) => (
            <div key={k.key} className={styles.keyRow}>
              <div className={styles.keyInfo}>
                <div className={styles.keyName}>{k.key}</div>
                <div className={styles.keyDesc}>{k.desc}</div>
              </div>
              <div className={styles.keyMeta}>
                {k.count !== null && <div>{k.count}개 항목</div>}
                <div>{formatSize(k.size)}</div>
              </div>
              <button
                type="button"
                className={styles.delBtn}
                onClick={() => handleRemove(k.key, k.desc)}
              >
                초기화
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn danger"
            style={{ marginTop: 14 }}
            onClick={handleRemoveAll}
          >
            전체 데이터 초기화
          </button>
          <div className="notice" style={{ marginTop: 10 }}>
            프로필(youth.profile)을 지우면 홈 진입 시 온보딩으로 이동해요.
          </div>
        </>
      )}
    </>
  );
}
