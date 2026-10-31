import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocale } from "@/lib/i18n/server";
import { processDocumentExtraction } from "@/server/extract-document";
import { rateLimitCheck } from "@/server/rate-limit";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

type SupportedMime = "image/jpeg" | "image/png" | "application/pdf";

function sniffMime(buf: Buffer): SupportedMime | null {
  if (buf.length >= JPEG_MAGIC.length && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf.length >= PNG_MAGIC.length &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  if (
    buf.length >= PDF_MAGIC.length &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46
  )
    return "application/pdf";
  return null;
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
  const locale = await getLocale();

  const rateLimit = await rateLimitCheck(user.id, "documents");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

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

  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const mime = sniffMime(buf);
  if (!mime) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (buf.length > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }

  const crypto = await import("node:crypto");
  const checksum = crypto.createHash("sha256").update(buf).digest("hex");

  const repo = getRepo();
  // Duplicate detection
  const existing = await repo.findDocumentByChecksum(user.id, checksum);
  if (existing) {
    return NextResponse.json(
      { error: "duplicate", id: existing.id },
      { status: 409 }
    );
  }

  const fileRef = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
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

    const result = await processDocumentExtraction({
      userId: user.id,
      doc,
      buf,
      mime,
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
      { status: 201 }
    );
  } catch {
    if (doc) {
      try {
        await repo.updateDocumentStatus(user.id, doc.id, "failed");
      } catch {}
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
