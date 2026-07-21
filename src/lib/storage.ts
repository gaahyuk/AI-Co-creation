import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "documents";

const ALLOWED_EXTENSIONS: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export function isAllowedExtension(ext: string): boolean {
  return ext.toLowerCase() in ALLOWED_EXTENSIONS;
}

export function contentTypeForExtension(ext: string): string {
  return ALLOWED_EXTENSIONS[ext.toLowerCase()] ?? "application/octet-stream";
}

// 사용자가 올린 원본 파일명은 서빙용 응답 헤더/화면 표시에만 쓰고,
// 실제 저장 경로는 항상 서버가 생성한 랜덤 id + 확장자만 사용한다 (경로 조작 방지).
// filePath는 Supabase Storage 버킷("documents") 안의 오브젝트 키(예: {userId}/{uuid}.pdf)다.
export async function saveDocumentFile(
  userId: string,
  extension: string,
  buffer: Buffer
): Promise<{ filePath: string }> {
  const supabase = await createClient();
  const filePath = `${userId}/${randomUUID()}.${extension.toLowerCase()}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: contentTypeForExtension(extension),
      upsert: false,
    });

  if (error) {
    throw new Error(`파일 업로드 실패: ${error.message}`);
  }

  return { filePath };
}

export async function readDocumentFile(filePath: string): Promise<Buffer> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

  if (error || !data) {
    throw new Error(`파일 다운로드 실패: ${error?.message ?? "unknown error"}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function deleteDocumentFile(filePath: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

  if (error) {
    throw new Error(`파일 삭제 실패: ${error.message}`);
  }
}
