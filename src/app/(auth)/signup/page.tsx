import Link from "next/link";
import { CredentialsForm } from "./credentials-form";
import { SocialLoginButtons } from "../social-login-buttons";

export default function SignupPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">회원가입</h1>
        <p className="mb-6 text-sm text-slate-500">30초면 시작할 수 있어요.</p>
        <SocialLoginButtons />
        <div className="my-5 flex items-center gap-2 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          또는 이메일로 가입
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <CredentialsForm />
        <p className="mt-6 text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
