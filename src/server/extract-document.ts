import { getRepo } from "@/server/repo/index";
import { getAI } from "@/server/ai/index";
import { crossCheckField } from "@/server/ai/crosscheck";
import { locateField, type OcrWord } from "@/server/ai/locate";
import { toExtractedField } from "@/lib/schemas/ai";
import { resolveDocumentDate } from "@/lib/document-date";
import { todayISODate } from "@/server/dates";
import type { Document } from "@/lib/schemas";

export async function processDocumentExtraction({
  userId,
  doc,
  buf,
  mime,
  clientOcrText,
  ocrWords = [],
  locale,
}: {
  userId: string;
  doc: Document;
  buf: Buffer;
  mime: string;
  clientOcrText: string;
  ocrWords?: OcrWord[];
  locale: "bn" | "en";
}): Promise<{ status: "needs_review" | "failed"; error?: string }> {
  const repo = getRepo();

  // AI extraction + deterministic cross-check.
  // Keep the browser OCR text (don't overwrite with the model's echo).
  const ocrText = clientOcrText;
  let aiResult;
  try {
    aiResult = await getAI().extractDocument(buf, mime, ocrText, doc.id, locale);
  } catch {
    await repo.updateDocumentStatus(userId, doc.id, "failed");
    return { status: "failed", error: "ai_failed" };
  }

  const fields = aiResult.fields.map((f) => {
    const { agreement, needsReview, ocrValue } = crossCheckField(f, ocrText);
    return toExtractedField(f, agreement, needsReview, ocrValue, locateField(f, ocrWords));
  });

  const date = resolveDocumentDate(aiResult.documentDateRaw, aiResult.documentDate, todayISODate());

  await repo.createExtraction({
    userId,
    documentId: doc.id,
    documentType: aiResult.documentType,
    documentDateRaw: aiResult.documentDateRaw,
    documentDate: date.date,
    dateNeedsReview: date.needsReview,
    fields,
    ocrText,
  });
  await repo.updateDocumentStatus(userId, doc.id, "needs_review");

  return { status: "needs_review" };
}
