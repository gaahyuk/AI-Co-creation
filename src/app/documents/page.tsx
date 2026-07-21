import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { DOC_TYPES, docTypeName } from "@/lib/constants";
import { deleteDocument, updateDocumentType } from "@/lib/actions/documents";
import { UploadForm } from "./upload-form";

const OCR_STATUS_LABEL: Record<string, string> = {
  pending: "분석 대기 중",
  done: "분석 완료",
  failed: "분석 실패",
};

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">서류함</h1>
      <p className="mb-6 text-sm text-slate-500">
        한 번 업로드한 서류는 여러 정책 신청에 재사용됩니다. 업로드하면 자동으로 문서
        종류를 분류하며, 분류가 잘못됐다면 직접 수정할 수 있습니다.
      </p>

      <UploadForm />

      {documents.length === 0 ? (
        <p className="text-sm text-gray-400">업로드된 서류가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {documents.map((doc) => (
            <li key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <a
                    href={`/api/documents/${doc.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-violet-600 hover:underline"
                  >
                    {doc.fileName}
                  </a>
                  <p className="text-xs text-slate-500">
                    {OCR_STATUS_LABEL[doc.ocrStatus] ?? doc.ocrStatus} ·{" "}
                    {doc.uploadedAt.toISOString().slice(0, 10)}
                  </p>
                </div>
                <form action={deleteDocument.bind(null, doc.id)}>
                  <button
                    type="submit"
                    className="whitespace-nowrap rounded border border-gray-300 px-2 py-1 text-xs text-red-600"
                  >
                    삭제
                  </button>
                </form>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">분류 결과:</span>
                <span className="font-medium">{docTypeName(doc.docType)}</span>
              </div>

              <form
                action={updateDocumentType.bind(null, doc.id)}
                className="mt-2 flex items-center gap-2"
              >
                <select
                  key={doc.docType ?? "unclassified"}
                  name="docType"
                  defaultValue={doc.docType ?? ""}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  <option value="" disabled>
                    문서 종류 직접 선택
                  </option>
                  {DOC_TYPES.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  분류 수정
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
