"use client";

import { useState, useEffect } from "react";

interface DocumentItem {
  id: string;
  code: string;
  title: string;
  description: string;
  isRequired: boolean;
  policyGuide: string | null;
  steps: string[];
  issuePlaces: Array<{
    name: string;
    address: string;
    phone: string;
  }>;
  fee: number | null;
  processingDay: number | null;
  status: string;
  completedAt: string | null;
}

interface DocumentChecklistProps {
  policyId: string;
  documents: DocumentItem[];
  summary: {
    total: number;
    required: number;
    completed: number;
  };
}

export function DocumentChecklist({
  policyId,
  documents: initialDocs,
  summary: initialSummary,
}: DocumentChecklistProps) {
  const [documents, setDocuments] = useState(initialDocs);
  const [summary, setSummary] = useState(initialSummary);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleDocumentStatus = async (docCode: string) => {
    setLoading(true);
    try {
      const doc = documents.find((d) => d.code === docCode);
      const newStatus =
        doc?.status === "not_started" ? "completed" : "not_started";

      const response = await fetch(
        `/api/policies/${policyId}/documents/${docCode}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) throw new Error("Failed to update status");

      const result = await response.json();

      // 로컬 상태 업데이트
      setDocuments(
        documents.map((d) =>
          d.code === docCode
            ? { ...d, status: result.progress.status }
            : d
        )
      );

      // 요약 정보 업데이트
      setSummary({
        total: result.summary.total,
        required: summary.required,
        completed: result.summary.completed,
      });
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage =
    summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  return (
    <div className="mt-8 rounded-lg border border-slate-200 p-6">
      {/* 제목 */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">📋 필요 서류</h3>
        <p className="mt-1 text-sm text-slate-600">
          신청에 필요한 서류를 준비하세요
        </p>
      </div>

      {/* 진행 바 */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            준비 완료: {summary.completed}/{summary.total}
          </span>
          <span className="text-sm font-bold text-violet-600">
            {progressPercentage}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-violet-600 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* 서류 목록 */}
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-violet-300"
          >
            {/* 헤더 */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={doc.status === "completed"}
                onChange={() => toggleDocumentStatus(doc.code)}
                disabled={loading}
                className="mt-1 h-5 w-5 cursor-pointer rounded border-slate-300 text-violet-600"
              />
              <div
                className="flex-1 cursor-pointer"
                onClick={() =>
                  setExpandedDoc(expandedDoc === doc.id ? null : doc.id)
                }
              >
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-semibold ${
                      doc.status === "completed"
                        ? "line-through text-slate-400"
                        : "text-slate-900"
                    }`}
                  >
                    {doc.title}
                  </h4>
                  {doc.isRequired && (
                    <span className="text-xs font-bold text-red-600">필수</span>
                  )}
                </div>
                {doc.description && (
                  <p className="mt-1 text-sm text-slate-600">
                    {doc.description}
                  </p>
                )}
              </div>
              <span className="text-slate-400">
                {expandedDoc === doc.id ? "▼" : "▶"}
              </span>
            </div>

            {/* 상세 정보 */}
            {expandedDoc === doc.id && (
              <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                {/* 정책별 안내 */}
                {doc.policyGuide && (
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-sm text-blue-900">{doc.policyGuide}</p>
                  </div>
                )}

                {/* 준비 단계 */}
                {doc.steps.length > 0 && (
                  <div>
                    <h5 className="mb-2 font-semibold text-slate-900">
                      📝 준비 방법
                    </h5>
                    <ol className="space-y-2">
                      {doc.steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-slate-700 before:mr-3 before:content-[counter(item)'.']"
                        >
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* 발급처 */}
                {doc.issuePlaces.length > 0 && (
                  <div>
                    <h5 className="mb-2 font-semibold text-slate-900">
                      🏢 발급처
                    </h5>
                    <div className="space-y-2">
                      {doc.issuePlaces.map((place, idx) => (
                        <div
                          key={idx}
                          className="rounded bg-slate-50 p-2 text-sm"
                        >
                          <p className="font-medium text-slate-900">
                            {place.name}
                          </p>
                          <p className="text-slate-600">{place.address}</p>
                          <p className="text-slate-600">{place.phone}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 비용 및 기간 */}
                <div className="flex gap-4 text-sm">
                  {doc.fee !== null && (
                    <div>
                      <span className="text-slate-600">수수료: </span>
                      <span className="font-semibold text-slate-900">
                        {doc.fee === 0 ? "무료" : `${doc.fee.toLocaleString()}원`}
                      </span>
                    </div>
                  )}
                  {doc.processingDay !== null && (
                    <div>
                      <span className="text-slate-600">처리기간: </span>
                      <span className="font-semibold text-slate-900">
                        {doc.processingDay === 0 ? "즉시" : `약 ${doc.processingDay}일`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 준비 완료 메시지 */}
      {progressPercentage === 100 && (
        <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-emerald-900">
          <p className="font-semibold">✓ 모든 서류 준비가 완료되었습니다!</p>
          <p className="mt-1 text-sm">이제 신청 페이지로 이동하여 신청하세요.</p>
        </div>
      )}
    </div>
  );
}
