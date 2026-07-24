"use client";

// 정책 시즌 캘린더 — 월별 정책 신청 시즌 + 학사일정 연계 + 북마크 마감일 표시
// (이윤호 브랜치 /timelines 를 localStorage + 정적 시드 데이터 구조로 이식)

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile, profileToQuery, useBookmarks } from "@/lib/storage";
import { formatManwon } from "@/lib/format";
import type { PolicyWithEligibility } from "@/lib/youth/types";
import {
  SEASON_BADGES,
  seasonsForMonth,
  timingsForMonth,
  academicNoticesForMonth,
  academicEventsForMonth,
  monthlyDensity,
  type PolicyTiming,
} from "@/lib/timeline-data";
import styles from "./timelines.module.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 표준 5분류 → 카테고리 태그 색상 클래스 */
const CAT_CLASS: Record<PolicyTiming["category"], string> = {
  일자리: styles.catJob,
  주거: styles.catHousing,
  교육: styles.catEdu,
  복지문화: styles.catWelfare,
  참여권리: styles.catRights,
};

/** 시즌 정책 한 줄 */
function TimingRow({
  timing,
  badge,
  badgeClass,
}: {
  timing: PolicyTiming;
  badge: string;
  badgeClass: string;
}) {
  return (
    <div className={styles.timingRow}>
      <span className={`${styles.catTag} ${CAT_CLASS[timing.category]}`}>
        {timing.category}
      </span>
      <div className={styles.timingBody}>
        <div className={styles.timingName}>{timing.name}</div>
        <div className={styles.timingDesc}>
          {timing.description} · 검색어 “{timing.keyword}”
        </div>
      </div>
      <span className={`${styles.timingBadge} ${badgeClass}`}>{badge}</span>
    </div>
  );
}

export default function TimelinesPage() {
  const router = useRouter();
  const { profile, loaded } = useProfile();
  const { ids: bookmarkIds } = useBookmarks();

  // 표시 중인 연/월
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1~12

  // 북마크한 정책 상세 수집 (홈 화면과 동일한 패턴)
  const [bookmarked, setBookmarked] = useState<PolicyWithEligibility[]>([]);
  useEffect(() => {
    if (!loaded || bookmarkIds.length === 0) {
      setBookmarked([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const q = profileToQuery(profile);
      const results = await Promise.all(
        bookmarkIds.map(async (id) => {
          try {
            const res = await fetch(`/api/policies/${id}${q ? `?${q}` : ""}`);
            return res.ok ? ((await res.json()) as PolicyWithEligibility) : null;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setBookmarked(results.filter((p): p is PolicyWithEligibility => p !== null));
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, profile, bookmarkIds]);

  // 표시 중인 달에 마감(periodEnd)이 있는 북마크 정책
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}-`;
  const deadlinesThisMonth = bookmarked
    .filter((p) => p.periodEnd?.startsWith(monthPrefix))
    .sort((a, b) => (a.periodEnd ?? "").localeCompare(b.periodEnd ?? ""));
  // 날짜(일) → 마감 정책 수
  const deadlineDays = new Map<number, number>();
  for (const p of deadlinesThisMonth) {
    const day = Number(p.periodEnd!.slice(8, 10));
    if (day >= 1) deadlineDays.set(day, (deadlineDays.get(day) ?? 0) + 1);
  }

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };
  const goToMonth = (m: number) => setMonth(m);

  // 달력 그리드 계산
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=일
  const daysInMonth = new Date(year, month, 0).getDate();
  const isThisMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // 시즌/시드 데이터
  const seasons = seasonsForMonth(month).filter((s) => s !== "all_year");
  const { optimal, seasonal, allYear } = timingsForMonth(month);
  const notices = academicNoticesForMonth(month);
  const events = academicEventsForMonth(month);
  const density = useMemo(() => monthlyDensity(), []);
  const maxDensity = Math.max(...density, 1);

  return (
    <>
      <div className="header">
        <div
          onClick={() => router.back()}
          style={{ cursor: "pointer", color: "var(--text-sub)", marginBottom: 8 }}
        >
          ‹ 뒤로
        </div>
        <h1>정책 캘린더</h1>
        <div className="sub">학기별·시즌별로 신청할 정책을 한눈에 확인하세요</div>
      </div>

      <div className="section">
        {/* 월 네비게이션 + 달력 */}
        <div className="card">
          <div className={styles.monthNav}>
            <button className={styles.navBtn} onClick={prevMonth}>
              ‹ 이전달
            </button>
            <div className={styles.monthLabel}>
              {year}년 {month}월
            </div>
            <button className={styles.navBtn} onClick={nextMonth}>
              다음달 ›
            </button>
          </div>

          {/* 이달의 시즌 배지 */}
          {seasons.length > 0 && (
            <div className={styles.seasonChips}>
              {seasons.map((s) => (
                <span key={s} className={styles.seasonChip}>
                  {SEASON_BADGES[s]}
                </span>
              ))}
            </div>
          )}

          {/* 달력 그리드 (순수 CSS) — 북마크 정책 마감일 표시 */}
          <div className={styles.calGrid}>
            {WEEKDAYS.map((w, i) => (
              <div
                key={w}
                className={`${styles.calWeekday} ${i === 0 ? styles.sun : ""}`}
              >
                {w}
              </div>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`pad-${i}`} className={styles.calDay} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = isThisMonth && day === today.getDate();
              const hasDeadline = deadlineDays.has(day);
              const weekday = (firstWeekday + i) % 7;
              return (
                <div
                  key={day}
                  className={[
                    styles.calDay,
                    weekday === 0 ? styles.sun : "",
                    isToday ? styles.today : "",
                    hasDeadline ? styles.deadline : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {day}
                  {hasDeadline && <span className={styles.calDot} />}
                </div>
              );
            })}
          </div>
          <div className={styles.calLegend}>
            <span>
              <i className={styles.legendToday} /> 오늘
            </span>
            <span>
              <i className={styles.legendDeadline} /> 저장한 정책 마감일
            </span>
          </div>
        </div>

        {/* 학사일정 연계 알림 (방학/개강 시즌) */}
        {notices.map((n) => (
          <div key={n.title} className={styles.acadNotice}>
            <span className={styles.acadIcon}>{n.icon}</span>
            <div>
              <div className={styles.acadTitle}>{n.title}</div>
              <div className={styles.acadBody}>{n.body}</div>
            </div>
          </div>
        ))}

        {/* 학사 이벤트 (수강신청 등) */}
        {events.length > 0 && (
          <div className="card">
            <div className="section-title" style={{ margin: "0 0 4px" }}>
              🗓️ 이달의 학사일정
            </div>
            {events.map((e) => (
              <div key={e.name} className={styles.eventRow}>
                <span className={styles.eventName}>{e.name}</span>
                <span className={styles.eventPeriod}>{e.period}</span>
              </div>
            ))}
          </div>
        )}

        {/* 저장한 정책 이달 마감 */}
        <div className="section-title">
          ⏰ 저장한 정책 이달 마감
          <small>{deadlinesThisMonth.length}건</small>
        </div>
        {bookmarkIds.length === 0 ? (
          <div className="notice">
            정책 상세에서 ☆ 를 눌러 저장하면 마감일이 캘린더에 표시돼요.
          </div>
        ) : deadlinesThisMonth.length === 0 ? (
          <div className="notice">
            {month}월에 마감되는 저장 정책이 없어요. 다른 달을 확인해보세요.
          </div>
        ) : (
          deadlinesThisMonth.map((p) => (
            <Link key={p.id} href={`/policy/${p.id}`}>
              <div className="card policy-card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="cat">{p.category || "기타"}</span>
                  {p.dDay !== null && p.dDay >= 0 ? (
                    <span className={p.dDay <= 14 ? "dday" : "dday safe"}>
                      D-{p.dDay}
                    </span>
                  ) : (
                    <span className="dday safe">마감</span>
                  )}
                </div>
                <div className="card-body">
                  <div style={{ minWidth: 0 }}>
                    <div className="name">{p.name}</div>
                    <div className="inst">
                      {p.periodEnd} 마감 · {p.institution}
                    </div>
                  </div>
                  {p.amount !== null && (
                    <div className="card-amount">
                      약 <b>{formatManwon(p.amount)}</b>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}

        {/* 이달의 시즌 정책 */}
        <div className="section-title">
          📌 {month}월 시즌 정책
          <small>공고가 몰리는 정책 유형</small>
        </div>
        {optimal.length + seasonal.length === 0 ? (
          <div className="notice">
            이달에 공고가 집중되는 시즌 정책이 없어요. 아래 상시 정책을
            확인해보세요.
          </div>
        ) : (
          <div className="card">
            {optimal.map((t) => (
              <TimingRow
                key={t.name}
                timing={t}
                badge="신청 적기"
                badgeClass={styles.badgeOptimal}
              />
            ))}
            {seasonal.map((t) => (
              <TimingRow
                key={t.name}
                timing={t}
                badge="시즌 해당"
                badgeClass={styles.badgeSeasonal}
              />
            ))}
          </div>
        )}

        {/* 연중 상시 정책 */}
        {allYear.length > 0 && (
          <>
            <div className="section-title">
              🔄 연중 상시 모집
              <small>언제든 신청 가능</small>
            </div>
            <div className="card">
              {allYear.map((t) => (
                <TimingRow
                  key={t.name}
                  timing={t}
                  badge="상시"
                  badgeClass={styles.badgeAllYear}
                />
              ))}
            </div>
          </>
        )}

        {/* 월별 공고 밀집도 차트 (순수 CSS) */}
        <div className="section-title">
          📊 월별 공고 밀집도
          <small>상시 정책 제외</small>
        </div>
        <div className="card">
          <div className={styles.chart}>
            {density.map((count, i) => {
              const m = i + 1;
              const isCurrent = m === month;
              return (
                <button
                  key={m}
                  className={styles.chartCol}
                  onClick={() => goToMonth(m)}
                  aria-label={`${m}월 시즌 정책 ${count}개`}
                >
                  <div
                    className={`${styles.chartBar} ${isCurrent ? styles.current : ""}`}
                    style={{ height: `${Math.max((count / maxDensity) * 100, 6)}%` }}
                  />
                  <span
                    className={`${styles.chartMonth} ${isCurrent ? styles.current : ""}`}
                  >
                    {m}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="hint" style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 10 }}>
            막대를 누르면 해당 달로 이동해요.
          </div>
        </div>

        {/* 타임라인 팁 */}
        <div className={styles.tipCard}>
          <h3>💡 정책 타임라인 팁</h3>
          <ul>
            <li>
              • <b>학기 시작 (3월, 9월)</b>: 국가장학금 등 교육 관련 정책 신청
              최적 시기
            </li>
            <li>
              • <b>여름방학 (6-8월)</b>: 청년인턴 등 실무 경험 프로그램
            </li>
            <li>
              • <b>겨울방학 (12-2월)</b>: 집중 교육 프로그램 신청 기간
            </li>
            <li>
              • <b>연중 상시</b>: 청년내일저축계좌 등 상시 모집 정책
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
