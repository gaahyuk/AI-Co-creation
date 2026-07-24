"use client";

// 정책 뉴스 + 뉴스레터 구독 페이지
// - 시드 뉴스와 관리자 등록 뉴스(youth.news.custom)를 병합해 최신순으로 표시
// - 카테고리 필터 + 페이지네이션
// - 뉴스레터 이메일 구독 폼 (youth.newsletter 저장)

import { useEffect, useMemo, useState } from "react";
import {
  useNews,
  useNewsletter,
  isValidEmail,
  NEWS_CATEGORIES,
  type NewsItem,
} from "@/lib/news-data";
import styles from "./news.module.css";

const PAGE_SIZE = 10;

const FREQUENCIES = [
  { value: "daily", label: "매일" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
] as const;

/** 게시일을 한국식 표기로 (형식이 어긋나면 원문 그대로) */
function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("ko-KR");
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="card">
      <div className={styles.meta}>
        <span className={item.isCustom ? "tag blue" : "tag"}>{item.category}</span>
        <span className={styles.source}>{item.source}</span>
        {item.date && <span className={styles.date}>{formatDate(item.date)}</span>}
      </div>
      <h3 className={styles.title}>{item.title}</h3>
      {item.summary && <p className={styles.summary}>{item.summary}</p>}
      <div className={styles.footer}>
        {item.isCustom ? <span className="tag green">신규 등록</span> : <span />}
        {item.url && (
          <a
            className={styles.link}
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            자세히 보기 →
          </a>
        )}
      </div>
    </div>
  );
}

/** 뉴스레터 구독 폼 — youth.newsletter 저장 */
function NewsletterCard() {
  const { newsletter, loaded, subscribe, unsubscribe } = useNewsletter();
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  // 저장된 구독 정보가 로드되면 폼 초기값으로 반영 (1회)
  useEffect(() => {
    if (!loaded || initialized) return;
    setInitialized(true);
    if (newsletter) {
      setEmail(newsletter.email);
      setCategories(newsletter.categories ?? []);
      setFrequency(newsletter.frequency ?? "weekly");
    }
  }, [loaded, initialized, newsletter]);

  const isSubscribed = newsletter?.subscribed ?? false;

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const onSubscribe = () => {
    setMessage("");
    setError("");
    if (!isValidEmail(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    subscribe(email, categories, frequency);
    setMessage(isSubscribed ? "구독 설정을 저장했어요." : "뉴스레터 구독이 완료됐어요.");
  };

  const onUnsubscribe = () => {
    setError("");
    unsubscribe();
    setMessage("구독이 취소됐어요.");
  };

  if (!loaded) return null;

  return (
    <div className="card">
      <div className={styles.newsletterHead}>
        <span className={styles.newsletterTitle}>📧 뉴스레터 구독</span>
        <span className={isSubscribed ? "tag green" : "tag"}>
          {isSubscribed ? "구독 중" : "구독 안 함"}
        </span>
      </div>
      <p className={styles.newsletterSub}>
        관심 카테고리의 새 정책 소식을 이메일로 받아보세요
      </p>

      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="newsletter-email">이메일 주소</label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className={styles.groupLabel}>관심 카테고리</div>
      <div className="chips">
        {NEWS_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${categories.includes(cat) ? "on" : ""}`}
            onClick={() => toggleCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.groupLabel}>수신 빈도</div>
      <div className="chips">
        {FREQUENCIES.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`chip ${frequency === f.value ? "on" : ""}`}
            onClick={() => setFrequency(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {message && <div className={styles.message}>{message}</div>}
      {error && <div className={styles.messageError}>{error}</div>}

      <div className={styles.actions}>
        {isSubscribed && (
          <button type="button" className="btn secondary" onClick={onUnsubscribe}>
            구독 취소
          </button>
        )}
        <button type="button" className="btn" onClick={onSubscribe}>
          {isSubscribed ? "설정 저장" : "구독하기"}
        </button>
      </div>

      <div className="notice" style={{ marginTop: 14 }}>
        구독 정보는 이 브라우저(localStorage)에만 저장돼요. 실제 메일이 발송되지는
        않아요.
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { items, loaded } = useNews();
  const [category, setCategory] = useState("전체");
  const [page, setPage] = useState(1);

  // 고정 카테고리 + 데이터에만 존재하는 카테고리(예: 관리자 뉴스 "공지") 추가
  const tabs = useMemo(() => {
    const extra = Array.from(new Set(items.map((n) => n.category))).filter(
      (c) => c && !NEWS_CATEGORIES.includes(c),
    );
    return ["전체", ...NEWS_CATEGORIES, ...extra];
  }, [items]);

  const filtered = useMemo(
    () => (category === "전체" ? items : items.filter((n) => n.category === category)),
    [items, category],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectCategory = (cat: string) => {
    setCategory(cat);
    setPage(1);
  };

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="header">
        <h1>📰 정책 뉴스</h1>
        <div className="sub">최신 정책 소식을 한눈에 확인하세요</div>
      </div>

      <div className="tabs">
        {tabs.map((cat) => (
          <div
            key={cat}
            className={`tab ${category === cat ? "active" : ""}`}
            onClick={() => selectCategory(cat)}
          >
            {cat}
          </div>
        ))}
      </div>

      <div className="section">
        {!loaded ? (
          <div className="loading">불러오는 중…</div>
        ) : pageItems.length === 0 ? (
          <div className="empty">
            아직 이 카테고리의 뉴스가 없어요.
            <br />
            다른 카테고리를 확인해보세요.
          </div>
        ) : (
          <>
            {pageItems.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}

            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => goPage(currentPage - 1)} disabled={currentPage <= 1}>
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={p === currentPage ? "pg-active" : ""}
                    onClick={() => goPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}

        <div className="section-title">뉴스레터</div>
        <NewsletterCard />
      </div>
    </>
  );
}
