"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatManwon } from "@/lib/format";

interface Recommendation {
  id: string;
  title: string;
  category: string;
  amount: number | null;
  score: number;
  reason: string;
}

export function PersonalizedRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch("/api/recommendations/personalized");
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations);
        }
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="text-center">
        <div className="inline-block rounded-lg bg-violet-100 px-6 py-3 text-violet-600">
          추천 정책을 분석 중입니다...
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">
          현재 추천할 정책이 없습니다. 프로필 정보를 완성해주세요.
        </p>
        <Link
          href="/profile"
          className="mt-4 inline-block rounded-lg bg-violet-600 px-6 py-2 font-semibold text-white hover:bg-violet-700"
        >
          프로필 완성하기
        </Link>
      </div>
    );
  }

  const categoryColor: Record<string, string> = {
    일자리: "bg-blue-50 text-blue-600",
    주거: "bg-emerald-50 text-emerald-600",
    교육: "bg-violet-50 text-violet-600",
    복지문화: "bg-rose-50 text-rose-600",
    참여권리: "bg-teal-50 text-teal-600",
  };

  return (
    <div className="space-y-4">
      {recommendations.map((rec) => (
        <Link
          key={rec.id}
          href={`/policies/${rec.id}`}
          className="block rounded-lg border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-lg"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* 카테고리 */}
              <div className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  ...((categoryColor[rec.category] || "bg-slate-100 text-slate-600").split(" ").reduce((acc: any, cls) => {
                    if (cls.startsWith("bg-")) acc.backgroundColor = cls;
                    if (cls.startsWith("text-")) acc.color = cls;
                    return acc;
                  }, {}))
                }}>
                {rec.category}
              </div>

              {/* 제목 */}
              <h3 className="text-lg font-bold text-slate-900">
                {rec.title}
              </h3>

              {/* 추천 이유 */}
              <p className="mt-2 text-sm text-slate-600">
                ✓ {rec.reason}
              </p>
            </div>

            {/* 점수와 금액 */}
            <div className="text-right">
              <div className="mb-2 rounded-lg bg-violet-100 px-3 py-1 text-center">
                <p className="text-xs text-violet-600 font-medium">매칭도</p>
                <p className="text-xl font-bold text-violet-700">
                  {rec.score}%
                </p>
              </div>
              {rec.amount && (
                <p className="font-bold text-violet-600">
                  {formatManwon(rec.amount)}
                </p>
              )}
            </div>
          </div>

          {/* 진행바 */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all"
              style={{ width: `${rec.score}%` }}
            />
          </div>
        </Link>
      ))}

      <div className="mt-8 rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 p-6">
        <h3 className="mb-3 font-bold text-slate-900">💡 추천 알고리즘</h3>
        <ul className="space-y-2 text-sm text-slate-700">
          <li>✓ 당신의 나이와 지역에 맞는 정책</li>
          <li>✓ 직업 상태 및 소득 조건 충족</li>
          <li>✓ 높은 지원금액 정책 우선</li>
          <li>✓ 마감일이 가까운 정책 강조</li>
        </ul>
      </div>
    </div>
  );
}
