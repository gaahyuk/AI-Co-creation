import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mb-4 text-6xl">404</div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">페이지를 찾을 수 없습니다</h1>
        <p className="mb-6 text-slate-500">요청하신 페이지가 존재하지 않습니다.</p>
        <Link
          href="/policies"
          className="inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-white hover:bg-violet-700"
        >
          정책 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
