import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";


import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CsvUploadForm } from "./csv-upload-form";
import { NewsForm } from "./news-form";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">접근 권한 없음</h1>
          <p className="text-slate-600 mb-4">관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  const [totalUsers, totalPolicies, totalNews, users] = await Promise.all([
    prisma.user.count(),
    prisma.policy.count(),
    prisma.policyNews.count(),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        provider: true,
        isAdmin: true,
        createdAt: true,
        profile: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl p-6">
          <h1 className="text-3xl font-bold text-slate-900">🛠️ 관리자 패널</h1>
        </div>
      </div>
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">총 사용자</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalUsers}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">정책</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalPolicies}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">뉴스</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalNews}</p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            👥 사용자 목록 ({users.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4 font-medium">이메일</th>
                  <th className="py-2 pr-4 font-medium">가입일</th>
                  <th className="py-2 pr-4 font-medium">가입 방식</th>
                  <th className="py-2 pr-4 font-medium">프로필</th>
                  <th className="py-2 pr-4 font-medium">권한</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-900">{u.email ?? "-"}</td>
                    <td className="py-2 pr-4 text-slate-600">
                      {u.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{u.provider}</td>
                    <td className="py-2 pr-4">
                      {u.profile ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          작성완료
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          미작성
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {u.isAdmin && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                          관리자
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">📰 뉴스 등록</h2>
            <NewsForm />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-900">📋 정책 CSV 일괄 등록</h2>
            <CsvUploadForm />
          </div>
        </div>
      </div>
    </div>
  );
}

