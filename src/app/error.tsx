"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">문제가 발생했습니다</h1>
          <p className="mb-6 text-slate-500">
            {error.message || "잠시 후 다시 시도해주세요."}
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-violet-600 px-6 py-2.5 text-white hover:bg-violet-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}
