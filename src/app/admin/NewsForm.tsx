"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "./page.module.css";

// 뉴스 등록 폼 — 원본(이윤호 브랜치 admin/news-form.tsx)의 서버액션 등록을
// youth.news.custom(localStorage) 배열 추가로 이식. 뉴스 페이지가 이 키를 읽는다.

const NEWS_KEY = "youth.news.custom";

/** 관리자가 추가한 뉴스 항목 (localStorage 키 계약과 동일한 형태) */
export interface CustomNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string; // YYYY-MM-DD
}

function loadNews(): CustomNews[] {
  try {
    const raw = localStorage.getItem(NEWS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? (arr as CustomNews[]) : [];
  } catch {
    return [];
  }
}

export default function NewsForm({ onChange }: { onChange?: () => void }) {
  const [list, setList] = useState<CustomNews[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    setList(loadNews());
  }, []);

  const persist = (next: CustomNews[]) => {
    setList(next);
    localStorage.setItem(NEWS_KEY, JSON.stringify(next));
    onChange?.();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOkMsg("");
    setErrMsg("");
    if (!title.trim() || !summary.trim()) {
      setErrMsg("제목과 요약을 모두 입력해주세요.");
      return;
    }
    if (url.trim() && !/^https?:\/\//.test(url.trim())) {
      setErrMsg("원문 링크는 http:// 또는 https:// 로 시작해야 해요.");
      return;
    }
    const item: CustomNews = {
      id: `news-${Date.now()}`,
      title: title.trim(),
      summary: summary.trim(),
      url: url.trim(),
      date: new Date().toISOString().slice(0, 10),
    };
    persist([item, ...list]);
    setTitle("");
    setSummary("");
    setUrl("");
    setOkMsg(`✅ "${item.title}" 뉴스가 등록됐어요. 정책 뉴스 페이지에 바로 노출돼요.`);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`"${name}" 뉴스를 삭제할까요?`)) return;
    persist(list.filter((n) => n.id !== id));
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>제목</label>
          <input
            type="text"
            maxLength={200}
            placeholder="예: 2026년 청년월세 지원 2차 모집 시작"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field">
          <label>요약 (내용)</label>
          <textarea
            rows={4}
            placeholder="뉴스 내용을 간단히 요약해주세요."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
        <div className="field">
          <label>원문 링크 (선택)</label>
          <input
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        {okMsg && <div className={styles.msgOk}>{okMsg}</div>}
        {errMsg && <div className={styles.msgErr}>⚠️ {errMsg}</div>}

        <button type="submit" className="btn" style={{ marginTop: 12 }}>
          뉴스 등록
        </button>
      </form>

      {list.length > 0 && (
        <>
          <hr className="divider" />
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            등록된 뉴스 {list.length}건
          </div>
          {list.map((n) => (
            <div key={n.id} className={styles.newsItem}>
              <div className={styles.keyInfo} style={{ flex: 1 }}>
                <div className={styles.newsTitle}>{n.title}</div>
                <div className={styles.newsSummary}>{n.summary}</div>
                <div className={styles.newsDate}>
                  {n.date}
                  {n.url && (
                    <>
                      {" · "}
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--toss-blue)" }}
                      >
                        원문 ↗
                      </a>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={styles.delBtn}
                onClick={() => handleDelete(n.id, n.title)}
              >
                삭제
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}
