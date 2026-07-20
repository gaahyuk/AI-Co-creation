import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "documents");

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
// 실제 디스크 경로는 항상 서버가 생성한 랜덤 id + 확장자만 사용한다 (경로 조작 방지).
export async function saveDocumentFile(
  userId: string,
  extension: string,
  buffer: Buffer
): Promise<{ filePath: string }> {
  const dir = path.join(STORAGE_ROOT, userId);
  await fs.mkdir(dir, { recursive: true });

  const storedFileName = `${randomUUID()}.${extension.toLowerCase()}`;
  const filePath = path.join(dir, storedFileName);
  await fs.writeFile(filePath, buffer);

  return { filePath };
}

export async function readDocumentFile(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

export async function deleteDocumentFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
