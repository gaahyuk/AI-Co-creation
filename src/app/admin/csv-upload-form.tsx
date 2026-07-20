"use client";

import { useActionState, useRef, useState } from "react";
import { uploadLocalPolicies } from "@/lib/actions/admin";

const SAMPLE = `sourceId,title,category,ageMin,ageMax,regionCodes,jobStatusCodes,incomeMaxPercent,applyStart,applyEnd,applyUrl,provisionInstName,estimatedAmount,requiredDocsText
seoul-2026-01,서울 청년 이사비 지원,주거,19,39,11,unemployed|employed,150,2026-03-01,2026-09-30,https://example.go.kr,서울특별시,40,"주민등록등본, 임대차계약서"`;

export function CsvUploadForm() {
  const [state, action, pending] = useActionState(uploadLocalPolicies, undefined);
  const [csv, setCsv] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCsv(await file.text());
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="text-sm text-slate-600"
        />
        <button
          type="button"
          onClick={() => setCsv(SAMPLE)}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:border-violet-300 hover:text-violet-600"
        >
          예시 채우기
        </button>
      </div>

      <textarea
        name="csv"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={10}
        placeholder="CSV 내용을 붙여넣거나 파일을 선택하세요."
        className="w-full rounded-xl border border-slate-200 p-3 font-mono text-xs focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />

      {state && "error" in state && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
      )}
      {state && "ok" in state && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <p className="font-medium">✅ {state.ok}</p>
          {state.rowErrors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-rose-600">
              {state.rowErrors.slice(0, 10).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !csv.trim()}
        className="w-fit rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
      >
        {pending ? "반영 중..." : "정책 일괄 반영"}
      </button>
    </form>
  );
}
