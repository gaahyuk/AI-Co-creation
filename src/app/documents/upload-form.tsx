"use client";

import { useActionState, useRef } from "react";
import { uploadDocument } from "@/lib/actions/documents";

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadDocument, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="mb-8 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-5"
    >
      <label htmlFor="file" className="text-sm font-medium">
        서류 업로드 (PDF, PNG, JPG / 최대 10MB)
      </label>
      <input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" required />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
      >
        {pending ? "업로드 및 분석 중..." : "업로드"}
      </button>
    </form>
  );
}
