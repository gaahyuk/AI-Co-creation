"use client";

import { deleteUser } from "@/lib/actions/admin";

export function DeleteUserButton({ userId, email }: { userId: string; email: string }) {
  return (
    <form
      action={deleteUser.bind(null, userId)}
      onSubmit={(e) => {
        if (!confirm(`${email} 계정을 삭제하시겠습니까?\n관련된 모든 데이터(프로필, 서류, 후기 등)가 함께 삭제되며 되돌릴 수 없습니다.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-rose-200 px-2.5 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
      >
        삭제
      </button>
    </form>
  );
}
