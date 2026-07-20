import Link from "next/link";
import { CredentialsForm } from "./credentials-form";
import { SocialLoginButtons } from "../social-login-buttons";

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">로그인</h1>
        <p className="mb-6 text-sm text-slate-500">맞춤 청년정책을 확인해보세요.</p>
        <SocialLoginButtons />
        <div className="my-5 flex items-center gap-2 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          또는 이메일로 로그인
          <div className="h-px flex-1 bg-slate-200" />
        </div>
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
