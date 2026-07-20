"use server";

import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOcrClient } from "@/lib/adapters";
import { classifyDocType } from "@/lib/document-classifier";
import { saveDocumentFile, deleteDocumentFile, isAllowedExtension } from "@/lib/storage";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export type UploadDocumentState = { error?: string } | undefined;

export async function uploadDocument(
  _state: UploadDocumentState,
  formData: FormData
): Promise<UploadDocumentState> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "파일을 선택해주세요." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "파일 크기는 10MB를 넘을 수 없습니다." };
  }

  const ext = path.extname(file.name).replace(".", "");
  if (!isAllowedExtension(ext)) {
    return { error: "PDF, PNG, JPG 파일만 업로드할 수 있습니다." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { filePath } = await saveDocumentFile(session.user.id, ext, buffer);

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      fileUrl: filePath,
      fileName: file.name,
      ocrStatus: "pending",
    },
  });

  try {
    const ocr = getOcrClient();
    const result = await ocr.extractText(file.name, filePath);
    const docType = classifyDocType(result.text);
    await prisma.document.update({
      where: { id: document.id },
      data: { ocrText: result.text, docType, ocrStatus: "done" },
    });
  } catch {
    await prisma.document.update({
      where: { id: document.id },
      data: { ocrStatus: "failed" },
    });
  }

  revalidatePath("/documents");
  revalidatePath("/policies");
}

export async function deleteDocument(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("로그인이 필요합니다.");
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.userId !== session.user.id) {
    throw new Error("문서를 찾을 수 없습니다.");
  }

  await deleteDocumentFile(document.fileUrl);
  await prisma.document.delete({ where: { id: documentId } });

  revalidatePath("/documents");
  revalidatePath("/policies");
}

export async function updateDocumentType(documentId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("로그인이 필요합니다.");
  }

  const docType = formData.get("docType");
  if (typeof docType !== "string" || docType === "") {
    throw new Error("문서 종류를 선택해주세요.");
  }

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document || document.userId !== session.user.id) {
    throw new Error("문서를 찾을 수 없습니다.");
  }

  await prisma.document.update({ where: { id: documentId }, data: { docType } });

  revalidatePath("/documents");
  revalidatePath("/policies");
}
