"use client";

import { useActionState } from "react";
import { createNews } from "@/lib/actions/admin";

const CATEGORIES = ["일자리", "주거", "교육", "복지문화", "참여권리"];

export function NewsForm() {
  const [state, action, pending] = useActionState(createNews, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          제목
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm font-medium">
          내용
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={5}
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="source" className="text-sm font-medium">
            출처
          </label>
          <input
            id="source"
            name="source"
            type="text"
            required
            placeholder="예: 온통청년"
            className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            카테고리
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
          >
            <option value="" disabled>
              선택해주세요
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="url" className="text-sm font-medium">
          원문 링크 (선택)
        </label>
        <input
          id="url"
          name="url"
          type="url"
          placeholder="https://..."
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="imageUrl" className="text-sm font-medium">
          이미지 URL (선택)
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          placeholder="https://..."
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✅ {state.ok}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
      >
        {pending ? "등록 중..." : "뉴스 등록"}
      </button>
    </form>
  );
}
