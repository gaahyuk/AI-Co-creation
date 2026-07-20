import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readDocumentFile, contentTypeForExtension } from "@/lib/storage";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, props: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(null, { status: 401 });
  }

  const { id } = await props.params;
  const document = await prisma.document.findUnique({ where: { id } });

  if (!document || document.userId !== session.user.id) {
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
