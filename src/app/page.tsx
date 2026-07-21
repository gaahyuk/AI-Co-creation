import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const user = await getCurrentUser();
  // 로그인 상태면 바로 맞춤 정책으로 보낸다.
  if (user) redirect("/policies");

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <span className="mb-4 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
        청년정책 맞춤 추천
      </span>
      <h1 className="text-3xl font-extrabold leading-tight text-slate-900">
        나에게 맞는 청년정책,
        <br />
        얼마나 받을 수 있을까?
      </h1>
      <p className="mt-4 text-slate-500">
        나이·지역·소득·고용상태만 입력하면 전국 청년정책 2,600여 건 중
        <br />
        내가 신청할 수 있는 정책과 필요 서류를 한눈에 알려드려요.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/signup"
          className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700"
        >
          시작하기
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:border-slate-300"
        >
          로그인
        </Link>
      </div>
    </main>
  );
}
