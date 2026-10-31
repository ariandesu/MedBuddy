import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocale } from "@/lib/i18n/server";
import { processDocumentExtraction } from "@/server/extract-document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locale = await getLocale();
  const { id } = await params;

  const repo = getRepo();
  const doc = await repo.getDocument(user.id, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const file = await repo.getFile(user.id, doc.fileRef);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const buf = Buffer.from(file.bytes);
  const clientOcrText = "";

  const result = await processDocumentExtraction({
    userId: user.id,
    doc,
    buf,
    mime: doc.mimeType,
    clientOcrText,
    locale,
  });

  if (result.status === "failed") {
    return NextResponse.json(
      { id: doc.id, status: "failed", error: "ai_failed", fileName: doc.fileName },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      id: doc.id,
      status: "needs_review",
      fileName: doc.fileName,
      sizeBytes: doc.sizeBytes,
    },
    { status: 200 }
  );
}
