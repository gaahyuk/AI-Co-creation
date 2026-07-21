import Link from "next/link";
import { CredentialsForm } from "./credentials-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">로그인</h1>
        <p className="mb-6 text-sm text-slate-500">맞춤 청년정책을 확인해보세요.</p>
        <CredentialsForm />
        <p className="mt-6 text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
