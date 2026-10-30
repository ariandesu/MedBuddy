import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getAI } from "@/server/ai/index";
import { crossCheckField } from "@/server/ai/crosscheck";
import { toExtractedField } from "@/lib/schemas/ai";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const Magic: Record<string, Buffer> = {
  jpg: Buffer.from([0xff, 0xd8, 0xff]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]),
};

function mimeFromExt(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "pdf":
      return "application/pdf";
    default:
      return null;
  }
}

function magicMatches(mime: string, buf: Buffer): boolean {
  const key =
    mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "pdf";
  const m = Magic[key];
  if (!m || buf.length < m.length) return false;
  for (let i = 0; i < m.length; i++) if (buf[i] !== m[i]) return false;
  return true;
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await getRepo().listDocuments(user.id);
  return NextResponse.json({
    documents: docs.map(({ id, fileName, mimeType, sizeBytes, status, createdAt }) => ({
      id,
      fileName,
      mimeType,
      sizeBytes,
      status,
      createdAt,
    })),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const clientOcrText = (formData.get("ocrText") as string) ?? "";
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mime = mimeFromExt(file.name);
  if (!mime) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  if (buf.length > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }
  if (!magicMatches(mime, buf)) {
    return NextResponse.json(
      { error: "File contents do not match declared type" },
      { status: 400 }
    );
  }

  const crypto = await import("node:crypto");
  const checksum = crypto.createHash("sha256").update(buf).digest("hex");
  const fileRef = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

  const repo = getRepo();
  let doc;
  try {
    await repo.storeFile(user.id, fileRef, buf, mime, file.name);
    doc = await repo.createDocument({
      userId: user.id,
      fileName: file.name,
      mimeType: mime,
      sizeBytes: buf.length,
      checksum,
      fileRef,
    });
    await repo.updateDocumentStatus(user.id, doc.id, "processing");

    // AI extraction + deterministic cross-check.
    let ocrText = clientOcrText;
    let aiResult;
    try {
      aiResult = await getAI().extractDocument(buf, mime, ocrText, doc.id);
      ocrText = aiResult.ocrText ?? ocrText;
    } catch {
      await repo.updateDocumentStatus(user.id, doc.id, "failed");
      return NextResponse.json(
        { id: doc.id, status: "failed", fileName: doc.fileName },
        { status: 502 }
      );
    }

    const fields = aiResult.fields.map((f) => {
      const { agreement, needsReview } = crossCheckField(f, ocrText);
      return toExtractedField(f, agreement, needsReview);
    });

    await repo.createExtraction({
      userId: user.id,
      documentId: doc.id,
      documentType: aiResult.documentType,
      documentDateRaw: aiResult.documentDateRaw,
      documentDate: aiResult.documentDate,
      fields,
      ocrText,
    });
    await repo.updateDocumentStatus(user.id, doc.id, "needs_review");

    const extraction = await repo.getExtractionByDocument(user.id, doc.id);

    return NextResponse.json(
      {
        id: doc.id,
        status: "needs_review",
        fileName: doc.fileName,
        sizeBytes: doc.sizeBytes,
        document: doc,
        extraction: extraction ?? null,
      },
      { status: 201 }
    );
  } catch {
    try {
      await repo.updateDocumentStatus(user.id, doc!.id, "failed");
    } catch {}
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
