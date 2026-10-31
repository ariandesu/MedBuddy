import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import type { Observation } from "@/lib/schemas/record";

const MED_FIELD = /^med_(\d+)_(name|dose|frequency|duration)$/;

type FieldInput = {
  rawValue?: string | null;
  label?: string;
  numericValue?: number | null;
  unit?: string | null;
  referenceRangeRaw?: string | null;
  page?: number;
  sources?: { muse: string | null; ocr: string | null } | null;
  agreement?: string | null;
  needsReview?: boolean | null;
};

function extractionToRecord(
  userId: string,
  documentId: string,
  documentType: "lab_report" | "prescription" | "other",
  recordDate: string | null,
  fields: Record<string, FieldInput>
) {
  const observations: Observation[] = [];
  const medsByIndex: Record<number, { name: string; dose: string; frequency: string; duration: string; uncertain?: boolean }> = {};

  for (const [key, f] of Object.entries(fields)) {
    const m = key.match(MED_FIELD);
    if (m) {
      const idx = Number(m[1]);
      const which = m[2] as "name" | "dose" | "frequency" | "duration";
      if (!medsByIndex[idx])
        medsByIndex[idx] = { name: "", dose: "", frequency: "", duration: "" };
      medsByIndex[idx][which] = f.rawValue ?? "";
      medsByIndex[idx].uncertain =
        medsByIndex[idx].uncertain ||
        Boolean(f.agreement !== "match" || f.needsReview);
    } else {
      observations.push({
        name: f.label ?? key,
        rawValue: f.rawValue ?? "",
        numericValue: f.numericValue ?? null,
        unit: f.unit ?? null,
        referenceRangeRaw: f.referenceRangeRaw ?? null,
        sourceDocumentId: documentId,
        page: f.page ?? 1,
      });
    }
  }

  const medications = Object.values(medsByIndex).map((m) => ({
    nameAsWritten: m.name ?? "",
    doseAsWritten: m.dose ?? "",
    frequencyAsWritten: m.frequency ?? "",
    durationAsWritten: m.duration ?? "",
    uncertain: Boolean(m.uncertain),
  }));

  return {
    userId,
    documentId,
    recordType: documentType,
    recordDate,
    observations,
    medications,
  };
}

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const repo = getRepo();
  const extraction = await repo.getExtraction(user.id, id);
  if (!extraction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = await repo.getDocument(user.id, extraction.documentId);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (doc.status === "confirmed") {
    return NextResponse.json({ error: "already_confirmed" }, { status: 409 });
  }

  // Server-side enforcement: every field must have needsReview: false
  // before confirmation is allowed.
  const fields = Object.fromEntries(
    extraction.fields.map((f) => [f.key, f])
  );
  const unreviewed = Object.values(fields).filter(
    (f) => f.needsReview === true
  );
  if (unreviewed.length > 0) {
    return NextResponse.json(
      { error: "review_required", message: "Please check every field before confirming." },
      { status: 409 }
    );
  }

  const input = extractionToRecord(
    user.id,
    extraction.documentId,
    extraction.documentType,
    extraction.documentDate,
    Object.fromEntries(extraction.fields.map((f) => [f.key, f]))
  );

  const record = await repo.createMedicalRecord(input);
  await repo.updateDocumentStatus(user.id, extraction.documentId, "confirmed");

  return NextResponse.json({
    id: record.id,
    documentId: record.documentId,
    status: "confirmed",
  });
}
