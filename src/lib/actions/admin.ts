"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export type AdminNewsState = { ok: string } | { error: string } | undefined;

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();

  if (admin.id === userId) {
    throw new Error("본인 계정은 삭제할 수 없습니다.");
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

export async function createNews(
  _state: AdminNewsState,
  formData: FormData
): Promise<AdminNewsState> {
  await requireAdmin();

  const title = formData.get("title");
  const content = formData.get("content");
  const source = formData.get("source");
  const category = formData.get("category");
  const url = formData.get("url");
  const imageUrl = formData.get("imageUrl");

  if (
    typeof title !== "string" || !title.trim() ||
    typeof content !== "string" || !content.trim() ||
    typeof source !== "string" || !source.trim() ||
    typeof category !== "string" || !category.trim()
  ) {
    return { error: "제목, 내용, 출처, 카테고리는 필수입니다." };
  }

  await prisma.policyNews.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      source: source.trim(),
      category: category.trim(),
      url: typeof url === "string" && url.trim() ? url.trim() : null,
      imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/news");
  return { ok: "뉴스가 등록되었습니다." };
}

export type AdminUploadState =
  | { ok: string; rowErrors: string[] }
  | { error: string }
  | undefined;

// 따옴표/콤마를 처리하는 최소 CSV 파서. 줄바꿈 여부를 먼저 줄 단위로 나누지 않고
// 원문 전체를 훑으며 따옴표 상태를 추적하므로, 따옴표로 감싼 셀 안의 줄바꿈도 보존한다.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n");

  function endCell() {
    row.push(cur.trim());
    cur = "";
  }
  function endRow() {
    endCell();
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      endCell();
    } else if (ch === "\n") {
      endRow();
    } else {
      cur += ch;
    }
  }
  if (cur !== "" || row.length > 0) endRow();

  return rows;
}

function toIntOrNull(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toDateOrNull(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toCodeArray(v: string | undefined): string[] {
  // 여러 값은 파이프(|)로 구분한다 (콤마는 CSV 구분자라 사용 불가).
  return (v ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

// 지자체가 올리는 수기 정책 CSV를 일괄 반영한다.
// 헤더 필수: title, category. 나머지 컬럼은 선택.
export async function uploadLocalPolicies(
  _state: AdminUploadState,
  formData: FormData
): Promise<AdminUploadState> {
  await requireAdmin();

  const csv = formData.get("csv");
  if (typeof csv !== "string" || !csv.trim()) {
    return { error: "CSV 내용을 붙여넣거나 파일을 선택해주세요." };
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return { error: "헤더 행과 최소 1개 데이터 행이 필요합니다." };
  }

  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  if (idx("title") === -1 || idx("category") === -1) {
    return { error: "헤더에 최소 title, category 컬럼이 있어야 합니다." };
  }

  const rowErrors: string[] = [];
  let saved = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (name: string) => {
      const i = idx(name);
      return i === -1 ? undefined : row[i];
    };

    const title = get("title");
    const category = get("category");
    if (!title || !category) {
      rowErrors.push(`${r + 1}행: title/category 누락으로 건너뜀`);
      continue;
    }

    const sourceId = get("sourceId") || title; // 없으면 제목을 고유키로 사용(재업로드 시 갱신)
    const incomeMaxPercent = toIntOrNull(get("incomeMaxPercent"));
    const amountManwon = toIntOrNull(get("estimatedAmount")); // 만원 단위 입력
    const regionCodes = toCodeArray(get("regionCodes"));
    const jobStatusCodes = toCodeArray(get("jobStatusCodes"));

    const data = {
      title,
      category,
      ageMin: toIntOrNull(get("ageMin")),
      ageMax: toIntOrNull(get("ageMax")),
      regionCodes: regionCodes.length > 0 ? regionCodes : undefined,
      jobStatusCodes: jobStatusCodes.length > 0 ? jobStatusCodes : undefined,
      incomeCondition:
        incomeMaxPercent != null
          ? { type: "bracket_percent", maxPercent: incomeMaxPercent }
          : undefined,
      requiredDocsText: get("requiredDocsText") || null,
      provisionInstName: get("provisionInstName") || null,
      estimatedAmount: amountManwon != null ? amountManwon * 10_000 : null,
      conditionsVerified: true,
      applyStart: toDateOrNull(get("applyStart")),
      applyEnd: toDateOrNull(get("applyEnd")),
      applyUrl: get("applyUrl") || null,
    };

    try {
      await prisma.policy.upsert({
        where: { sourceSystem_sourceId: { sourceSystem: "manual_local", sourceId } },
        update: { ...data, syncedAt: new Date() },
        create: { sourceSystem: "manual_local", sourceId, ...data },
      });
      saved++;
    } catch (err) {
      rowErrors.push(`${r + 1}행: 저장 실패 (${String(err).slice(0, 80)})`);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/policies");
  return { ok: `${saved}건 반영 완료`, rowErrors };
}
