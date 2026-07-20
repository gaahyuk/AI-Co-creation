export function PolicyCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pl-5 shadow-sm">
      {/* 왼쪽 사이드 색 바 */}
      <div className="absolute left-0 top-0 h-full w-1 bg-slate-200" />

      {/* 카테고리 뱃지 */}
      <div className="mb-2 h-6 w-16 animate-pulse rounded bg-slate-200" />

      {/* 제목 */}
      <div className="mb-2 h-6 animate-pulse rounded bg-slate-200" />
      <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-slate-200" />

      {/* 기관명 */}
      <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-slate-100" />

      {/* 하단: 지역·마감·태그 */}
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-12 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
      </div>

      {/* 액션 버튼들 */}
      <div className="flex gap-2">
        <div className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
        <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export function PolicyListSkeleton() {
  return (
    <ul className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <li key={i}>
          <PolicyCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-3xl bg-slate-200 p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 h-5 w-32 animate-pulse rounded bg-slate-300" />
          <div className="mt-2 h-12 w-48 animate-pulse rounded bg-slate-300" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-300" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-full bg-slate-300" />
      </div>
    </div>
  );
}
