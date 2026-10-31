import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Demo-only helper: creates a sample document + extraction so testers can walk
 * through the full upload → review → confirm flow without uploading real data.
 * No file bytes are stored; it's synthetic fixture content.
 */
const SAMPLES: Array<{
  fileName: string;
  mimeType: string;
  documentType: "lab_report" | "prescription" | "other";
  documentDateRaw: string | null;
  documentDate: string | null;
  fields: Array<{
    key: string;
    label: string;
    rawValue: string;
    numericValue: number | null;
    unit: string | null;
    referenceRangeRaw: string | null;
    page: number;
    sources: { muse: string | null; ocr: string | null };
    agreement: "match" | "mismatch" | "single_source";
    confidence: number | null;
    needsReview: boolean;
    userEdited: boolean;
  }>;
  ocrText: string;
}> = [
  {
    fileName: "Sample CBC Report.jpg",
    mimeType: "image/jpeg",
    documentType: "lab_report",
    documentDateRaw: "10/10/2026",
    documentDate: "2026-10-10",
    fields: [
      {
        key: "hemoglobin",
        label: "Hemoglobin",
        rawValue: "13.5",
        numericValue: 13.5,
        unit: "g/dL",
        referenceRangeRaw: "13.0-17.0",
        page: 1,
        sources: { muse: "13.5", ocr: "13.5" },
        agreement: "match",
        confidence: 0.98,
        needsReview: false,
        userEdited: false,
      },
      {
        key: "wbc",
        label: "WBC",
        rawValue: "7.2",
        numericValue: 7.2,
        unit: "x10^9/L",
        referenceRangeRaw: "4.0-11.0",
        page: 1,
        sources: { muse: "7.2", "ocr": "7.2" },
        agreement: "match",
        confidence: 0.97,
        needsReview: false,
        userEdited: false,
      },
      {
        key: "platelets",
        label: "Platelets",
        rawValue: "250",
        numericValue: 250,
        unit: "x10^9/L",
        referenceRangeRaw: "150-450",
        page: 1,
        sources: { muse: "250", ocr: null },
        agreement: "single_source",
        confidence: 0.82,
        needsReview: true,
        userEdited: false,
      },
    ],
    ocrText:
      "SAMPLE — NOT REAL PATIENT DATA. CBC Report. Hemoglobin 13.5 g/dL (13.0-17.0). WBC 7.2 x10^9/L (4.0-11.0). Platelets 250 x10^9/L (150-450).",
  },
  {
    fileName: "Sample Prescription.jpg",
    mimeType: "image/jpeg",
    documentType: "prescription",
    documentDateRaw: "18/10/2026",
    documentDate: "2026-10-18",
    fields: [
      {
        key: "med_1_name",
        label: "Medicine 1 — name",
        rawValue: "Napa 500mg",
        numericValue: null,
        unit: null,
        referenceRangeRaw: null,
        page: 1,
        sources: { muse: "Napa 500mg", ocr: "Napa 500mg" },
        agreement: "match",
        confidence: 0.95,
        needsReview: false,
        userEdited: false,
      },
      {
        key: "med_1_dose",
        label: "Medicine 1 — dose",
        rawValue: "1 tablet",
        numericValue: null,
        unit: null,
        referenceRangeRaw: null,
        page: 1,
        sources: { muse: "1 tablet", ocr: "1 tablet" },
        agreement: "match",
        confidence: 0.93,
        needsReview: false,
        userEdited: false,
      },
      {
        key: "med_1_frequency",
        label: "Medicine 1 — frequency",
        rawValue: "twice daily",
        numericValue: null,
        unit: null,
        referenceRangeRaw: null,
        page: 1,
        sources: { muse: "twice daily", ocr: "1+0+1" },
        agreement: "mismatch",
        confidence: 0.85,
        needsReview: true,
        userEdited: false,
      },
      {
        key: "med_1_duration",
        label: "Medicine 1 — duration",
        rawValue: "7 days",
        numericValue: null,
        unit: null,
        referenceRangeRaw: null,
        page: 1,
        sources: { muse: "7 days", ocr: "7 days" },
        agreement: "match",
        confidence: 0.96,
        needsReview: false,
        userEdited: false,
      },
    ],
    ocrText:
      "SAMPLE — NOT REAL PATIENT DATA. Dr. Rahman. Napa 500mg 1+0+1 7 days.",
  },
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Allow demo accounts (email starts with demo- and ends with @medisathi.app)
  // or demo data mode. Never create sample data against a real production DB
  // for a real user.
  const isDemoAccount =
    user.email.startsWith("demo-") && user.email.endsWith("@medisathi.app");
  if (!isDemoAccount) {
    return NextResponse.json(
      { error: "Sample data is only available for demo accounts" },
      { status: 403 }
    );
  }

  let body: { index?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const sampleIndex = z
    .number()
    .int()
    .min(0)
    .max(SAMPLES.length - 1)
    .safeParse(body.index);
  const sample = SAMPLES[
    sampleIndex.success ? sampleIndex.data : Math.floor(Math.random() * SAMPLES.length)
  ];
  const crypto = await import("node:crypto");
  const checksum = crypto
    .createHash("sha256")
    .update(`${sample.fileName}-${Date.now()}`)
    .digest("hex");
  const fileRef = `sample/${user.id}/${Date.now()}-${sample.fileName}`;
  const repo = getRepo();

  await repo.storeFile(
    user.id,
    fileRef,
    Buffer.from("SAMPLE-DOCUMENT-PLACEHOLDER"),
    sample.mimeType,
    sample.fileName
  );

  const doc = await repo.createDocument({
    userId: user.id,
    fileName: sample.fileName,
    mimeType: sample.mimeType,
    sizeBytes: sample.fileName.length,
    checksum,
    fileRef,
  });
  await repo.updateDocumentStatus(user.id, doc.id, "needs_review");

  const extraction = await repo.createExtraction({
    userId: user.id,
    documentId: doc.id,
    documentType: sample.documentType,
    documentDateRaw: sample.documentDateRaw,
    documentDate: sample.documentDate,
    fields: sample.fields,
    ocrText: sample.ocrText,
  });

  return NextResponse.json(
    {
      id: doc.id,
      status: "needs_review",
      fileName: doc.fileName,
      message: "Sample document created — review it in Documents.",
    },
    { status: 201 }
  );
}
