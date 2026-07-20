import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DocumentChecklist } from "./document-checklist";
import { PolicyFeedback } from "./policy-feedback";
import { PolicyShare } from "./policy-share";
import { PolicyQnA } from "./policy-qna";
import { PolicySuccessStories } from "./policy-success-stories";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id: policyId } = await params;

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
  });

  if (!policy) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-3xl">
          <Link href="/policies" className="text-violet-600 hover:underline">
            ← 돌아가기
          </Link>
          <div className="mt-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              정책을 찾을 수 없습니다
            </h1>
          </div>
        </div>
      </div>
    );
  }

  // 서류 정보 조회
  const documentGuides = await prisma.policyDocumentGuide.findMany({
    where: { policyId },
    include: { document: true },
  });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  const userProgress = await prisma.userDocumentProgress.findMany({
    where: {
      userId: user.id,
      policyId,
    },
  });

  const documents = documentGuides.map((dg) => {
    const progress = userProgress.find((p) => p.documentId === dg.documentId);
    return {
      id: dg.document.id,
      code: dg.document.code,
      title: dg.document.title,
      description: dg.document.description || "",
      isRequired: dg.isRequired,
      policyGuide: dg.guide,
      steps: dg.document.steps as string[],
      issuePlaces: dg.document.issuePlaces as Array<{
        name: string;
        address: string;
        phone: string;
      }>,
      fee: dg.document.fee,
      processingDay: dg.document.processingDay,
      status: progress?.status || "not_started",
      completedAt: progress?.uploadedAt ? progress.uploadedAt.toISOString() : null,
    };
  });

  const summary = {
    total: documents.length,
    required: documents.filter((d) => d.isRequired).length,
    completed: documents.filter(
      (d) => d.status === "completed" || d.status === "uploaded"
    ).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl p-6">
          <Link href="/policies" className="text-violet-600 hover:underline">
            ← 정책 목록으로
          </Link>

          <div className="mt-4">
            <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {policy.category}
            </span>

            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {policy.title}
            </h1>

            {policy.description && (
              <p className="mt-3 text-slate-600">{policy.description}</p>
            )}

            {/* 주요 정보 */}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {policy.applyStart && (
                <div>
                  <p className="text-xs font-medium text-slate-500">신청 시작</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {new Date(policy.applyStart).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              )}

              {policy.applyEnd && (
                <div>
                  <p className="text-xs font-medium text-slate-500">신청 마감</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {new Date(policy.applyEnd).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              )}

              {policy.estimatedAmount && (
                <div>
                  <p className="text-xs font-medium text-slate-500">지원금액</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {(policy.estimatedAmount / 1000000).toFixed(1)}백만원
                  </p>
                </div>
              )}

              {policy.provisionInstName && (
                <div>
                  <p className="text-xs font-medium text-slate-500">주관기관</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {policy.provisionInstName}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="mx-auto max-w-3xl p-6">
        {/* 지원 내용 */}
        {policy.supportContent && (
          <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              💰 지원 내용
            </h3>
            <p className="whitespace-pre-wrap text-slate-700">
              {policy.supportContent}
            </p>
          </div>
        )}

        {/* 서류 체크리스트 */}
        {documents.length > 0 && (
          <DocumentChecklist
            policyId={policyId}
            documents={documents}
            summary={summary}
          />
        )}

        {/* 신청 버튼 */}
        {policy.applyUrl && (
          <div className="mt-8">
            <a
              href={policy.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block w-full rounded-lg bg-violet-600 px-6 py-3 text-center font-semibold text-white hover:bg-violet-700"
            >
              신청 페이지로 이동 →
            </a>
          </div>
        )}

        {/* 공유하기 */}
        <div className="mt-12">
          <PolicyShare
            policyId={policyId}
            policyTitle={policy.title}
            amount={policy.estimatedAmount}
          />
        </div>

        {/* 커뮤니티 피드백 */}
        <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-bold text-slate-900">
            💬 사용자 후기
          </h3>
          <PolicyFeedback policyId={policyId} />
        </div>

        {/* 성공 후기 */}
        <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-bold text-slate-900">
            🎉 신청 성공 후기
          </h3>
          <PolicySuccessStories policyId={policyId} />
        </div>

        {/* Q&A */}
        <div className="mt-12 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-6 text-lg font-bold text-slate-900">
            ❓ 질문과 답변
          </h3>
          <PolicyQnA policyId={policyId} />
        </div>

        {/* 정책 정보 */}
        <div className="mt-12 rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 p-6">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            ℹ️ 정책 정보
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {policy.applyStart && (
              <div>
                <p className="text-sm text-slate-600">신청 시작</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {new Date(policy.applyStart).toLocaleDateString("ko-KR")}
                </p>
              </div>
            )}
            {policy.applyEnd && (
              <div>
                <p className="text-sm text-slate-600">신청 마감</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {new Date(policy.applyEnd).toLocaleDateString("ko-KR")}
                </p>
              </div>
            )}
            {policy.provisionInstName && (
              <div>
                <p className="text-sm text-slate-600">주관 기관</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {policy.provisionInstName}
                </p>
              </div>
            )}
            {policy.category && (
              <div>
                <p className="text-sm text-slate-600">정책 분야</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {policy.category}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
