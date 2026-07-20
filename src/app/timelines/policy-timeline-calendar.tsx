"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatManwon } from "@/lib/format";

interface TimelinePolicy {
  id: string;
  title: string;
  category: string;
  amount: number | null;
  org: string | null;
  applyEnd: string | null;
  applyUrl: string | null;
  timingSeasons: string[];
  interested: boolean;
}

interface CalendarData {
  month: number;
  year: number;
  seasons: string[];
  policies: TimelinePolicy[];
}

export function PolicyTimelineCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [policies, setPolicies] = useState<TimelinePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<TimelinePolicy | null>(
    null
  );

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/timelines/calendar?month=${month}&year=${year}`
        );
        if (response.ok) {
          const data: CalendarData = await response.json();
          setPolicies(data.policies);
        }
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, [month, year]);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(year, month - 2, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(year, month, 1)
    );
  };

  const monthLabel = new Date(year, month - 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const categoryColor: Record<string, string> = {
    일자리: "bg-blue-50 text-blue-600",
    주거: "bg-emerald-50 text-emerald-600",
    교육: "bg-violet-50 text-violet-600",
    복지문화: "bg-rose-50 text-rose-600",
    참여권리: "bg-teal-50 text-teal-600",
  };

  return (
    <div className="space-y-6">
      {/* 캘린더 헤더 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">📅 정책 타임라인</h2>
          <p className="text-sm text-slate-600">
            학기별/시즌별 정책 신청 가이드
          </p>
        </div>

        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            ← 이전달
          </button>

          <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900">{monthLabel}</h3>
            <div className="mt-2 flex justify-center gap-2">
              {["학기시작", "여름방학", "겨울방학"].map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-600"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleNextMonth}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            다음달 →
          </button>
        </div>
      </div>

      {/* 정책 목록 */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="col-span-full text-center text-slate-500">
            불러오는 중...
          </div>
        ) : policies.length > 0 ? (
          policies.map((policy) => (
            <Link
              key={policy.id}
              href={`/policies/${policy.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-violet-300 hover:shadow-md"
            >
              {/* 카테고리 태그 */}
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    categoryColor[policy.category] || "bg-slate-100 text-slate-600"
                  }`}
                >
                  {policy.category}
                </span>
                {policy.amount && (
                  <span className="text-base font-bold text-violet-600">
                    약 {formatManwon(policy.amount)}
                  </span>
                )}
              </div>

              {/* 정책 제목 */}
              <h3 className="mb-2 line-clamp-2 font-bold text-slate-900">
                {policy.title}
              </h3>

              {/* 기관명 */}
              {policy.org && (
                <p className="mb-3 text-sm text-slate-500">{policy.org}</p>
              )}

              {/* 마감일 */}
              {policy.applyEnd && (
                <div className="mb-3 flex items-center gap-2 text-sm">
                  <span className="text-slate-600">마감:</span>
                  <span className="font-medium text-slate-900">
                    {new Date(policy.applyEnd).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                {policy.applyUrl && (
                  <a
                    href={policy.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-violet-700"
                  >
                    신청 →
                  </a>
                )}
                {!policy.applyUrl && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedPolicy(policy);
                    }}
                    className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-200"
                  >
                    상세 보기
                  </button>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full rounded-lg bg-slate-50 p-6 text-center text-slate-600">
            <p>이 기간에 신청 가능한 정책이 없습니다.</p>
            <p className="mt-2 text-sm">다른 기간을 확인해보세요.</p>
          </div>
        )}
      </div>

      {/* 타임라인 팁 */}
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 p-6">
        <h4 className="mb-3 font-bold text-slate-900">💡 정책 타임라인 팁</h4>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>
            • <strong>학기 시작 (3월, 9월)</strong>: 국가장학금 등 교육 관련
            정책 신청 최적 시기
          </li>
          <li>
            • <strong>여름방학 (6-8월)</strong>: 청년인턴 등 실무 경험 프로그램
          </li>
          <li>
            • <strong>겨울방학 (12-2월)</strong>: 집중 교육 프로그램 신청 기간
          </li>
          <li>
            • <strong>연중 상시</strong>: 청년내일저축계좌 등 상시 모집 정책
          </li>
        </ul>
      </div>
    </div>
  );
}
