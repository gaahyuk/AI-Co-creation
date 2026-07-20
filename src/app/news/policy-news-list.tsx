"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  url: string | null;
  imageUrl: string | null;
  views: number;
  published: string;
}

export function PolicyNewsList() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [category, setCategory] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const url = new URL("/api/news", window.location.origin);
        if (category !== "전체") {
          url.searchParams.append("category", category);
        }
        url.searchParams.append("page", page.toString());

        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          setNews(data.news);
        }
      } catch (error) {
        console.error("Failed to fetch news:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category, page]);

  const categories = ["전체", "일자리", "주거", "교육", "복지문화", "참여권리"];

  return (
    <div className="space-y-6">
      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCategory(cat);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 font-medium transition-colors ${
              category === cat
                ? "bg-violet-600 text-white"
                : "border border-slate-200 text-slate-600 hover:border-violet-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 뉴스 목록 */}
      {loading ? (
        <div className="text-center text-slate-500">불러오는 중...</div>
      ) : news.length > 0 ? (
        <div className="space-y-4">
          {news.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-6 transition-all hover:shadow-md"
            >
              <div className="flex gap-4">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                )}

                <div className="flex-1">
                  {/* 메타 정보 */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.source}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.published).toLocaleDateString("ko-KR")}
                    </span>
                  </div>

                  {/* 제목 */}
                  <h3 className="mb-2 text-lg font-bold text-slate-900">
                    {item.title}
                  </h3>

                  {/* 내용 미리보기 */}
                  <p className="mb-3 line-clamp-2 text-sm text-slate-600">
                    {item.content}
                  </p>

                  {/* 하단 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      👁️ {item.views.toLocaleString()}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-violet-600 hover:underline"
                      >
                        자세히 보기 →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 p-8 text-center">
          <p className="text-slate-600">아직 뉴스가 없습니다.</p>
        </div>
      )}

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          이전
        </button>

        <span className="text-sm text-slate-600">
          페이지 {page}
        </span>

        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-600 hover:bg-slate-50"
        >
          다음
        </button>
      </div>
    </div>
  );
}
