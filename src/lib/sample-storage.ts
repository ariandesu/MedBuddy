/**
 * Client-side persistence for sample (demo-mode) documents.
 * Vercel serverless functions are stateless, so demo data created in
 * MemoryRepository doesn't survive across instance hops. Storing sample
 * docs/extractions/records in localStorage lets the review/confirm/timeline
 * pages read them back regardless of which instance handles the request.
 * Only used in demo mode (no MONGODB_URI) — never stores real patient data.
 */

const SAMPLE_DOCS_KEY = "medisathi_sample_documents";
const SAMPLE_EXTRACTIONS_KEY = "medisathi_sample_extractions";
const SAMPLE_RECORDS_KEY = "medisathi_sample_medical_records";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSampleDocuments(): any[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(SAMPLE_DOCS_KEY) || "[]");
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSampleDocument(docId: string): any | null {
  if (!isBrowser()) return null;
  return getSampleDocuments().find((d) => d.id === docId) || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function saveSampleDocument(doc: any): void {
  if (!isBrowser()) return;
  const docs = getSampleDocuments();
  localStorage.setItem(SAMPLE_DOCS_KEY, JSON.stringify([...docs, doc]));
}

export function removeSampleDocument(docId: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(
    SAMPLE_DOCS_KEY,
    JSON.stringify(getSampleDocuments().filter((d) => d.id !== docId))
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSampleExtractions(): any[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(SAMPLE_EXTRACTIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSampleExtraction(docId: string): any | null {
  if (!isBrowser()) return null;
  return getSampleExtractions().find((e) => e.documentId === docId) || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function saveSampleExtraction(extraction: any): void {
  if (!isBrowser()) return;
  const exts = getSampleExtractions();
  localStorage.setItem(SAMPLE_EXTRACTIONS_KEY, JSON.stringify([...exts, extraction]));
}

export function removeSampleExtraction(docId: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(
    SAMPLE_EXTRACTIONS_KEY,
    JSON.stringify(getSampleExtractions().filter((e) => e.documentId !== docId))
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSampleMedicalRecords(): any[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(SAMPLE_RECORDS_KEY) || "[]");
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function saveSampleMedicalRecord(record: any): void {
  if (!isBrowser()) return;
  const records = getSampleMedicalRecords();
  localStorage.setItem(SAMPLE_RECORDS_KEY, JSON.stringify([...records, record]));
}

export function markSampleDocumentConfirmed(docId: string): void {
  if (!isBrowser()) return;
  const docs = getSampleDocuments().map((d) =>
    d.id === docId ? { ...d, status: "confirmed" } : d
  );
  localStorage.setItem(SAMPLE_DOCS_KEY, JSON.stringify(docs));
}
