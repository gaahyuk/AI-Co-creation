import Link from "next/link";
import { CredentialsForm } from "./credentials-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">회원가입</h1>
        <p className="mb-6 text-sm text-slate-500">30초면 시작할 수 있어요.</p>
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
