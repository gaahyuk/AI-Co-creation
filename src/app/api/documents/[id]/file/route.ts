import path from "node:path";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { readDocumentFile, contentTypeForExtension } from "@/lib/storage";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, props: Props) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(null, { status: 401 });
  }

  const { id } = await props.params;
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document || document.userId !== user.id) {
    return new Response(null, { status: 404 });
  }

  const buffer = await readDocumentFile(document.fileUrl);
  const ext = path.extname(document.fileUrl).replace(".", "");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeForExtension(ext),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
    },
  });
}
