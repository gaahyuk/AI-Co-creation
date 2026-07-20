"use client";

import { useActionState } from "react";
import { saveProfile } from "@/lib/actions/profile";
import { REGIONS, JOB_STATUSES, INCOME_BRACKETS } from "@/lib/constants";

type Defaults = {
  birthDate?: string;
  regionCode?: string;
  jobStatus?: string;
  incomeBracket?: string;
  incomeAmount?: number | null;
  major?: string | null;
  phone?: string | null;
};

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="birthDate" className="text-sm font-medium">
          생년월일
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          defaultValue={defaults.birthDate}
          required
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="regionCode" className="text-sm font-medium">
          거주지역
        </label>
        <select
          id="regionCode"
          name="regionCode"
          defaultValue={defaults.regionCode ?? ""}
          required
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="" disabled>
            선택해주세요
          </option>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="jobStatus" className="text-sm font-medium">
          직업/고용상태
        </label>
        <select
          id="jobStatus"
          name="jobStatus"
          defaultValue={defaults.jobStatus ?? ""}
          required
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <option value="" disabled>
            선택해주세요
          </option>
          {JOB_STATUSES.map((j) => (
            <option key={j.code} value={j.code}>
              {j.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="incomeBracket" className="text-sm font-medium">
          소득 구간 (기준 중위소득 대비)
        </label>
        <select
          id="incomeBracket"
          name="incomeBracket"
          defaultValue={defaults.incomeBracket ?? "unknown"}
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {INCOME_BRACKETS.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="incomeAmount" className="text-sm font-medium">
          연소득(세전, 원 단위, 선택 입력)
        </label>
        <input
          id="incomeAmount"
          name="incomeAmount"
          type="number"
          min={0}
          placeholder="예: 30000000"
          defaultValue={defaults.incomeAmount ?? undefined}
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <p className="text-xs text-slate-400">
          연소득 상한 조건("연소득 OOO만원 이하")이 있는 정책의 매칭 정확도를 높이는 데 사용돼요.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="major" className="text-sm font-medium">
          전공 (선택 입력, 청년정책 특화조건용)
        </label>
        <input
          id="major"
          name="major"
          type="text"
          defaultValue={defaults.major ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-sm font-medium">
          휴대폰 번호 (선택 입력, 마감일 알림 발송용)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="010-0000-0000"
          defaultValue={defaults.phone ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-violet-600 px-3 py-3 font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
      >
        {pending ? "저장 중..." : "저장하고 매칭 결과 보기"}
      </button>
    </form>
  );
}
