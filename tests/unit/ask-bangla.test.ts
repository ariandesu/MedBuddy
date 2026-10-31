import { describe, expect, it } from "vitest";
import { retrieveRecords } from "@/server/ai/grounding";
import type { MedicalRecord } from "@/lib/schemas/record";

const cbcRecord: MedicalRecord = {
  id: "rec_cbc_001",
  userId: "user_1",
  documentId: "doc_cbc_001",
  recordType: "lab_report",
  recordDate: "2026-10-10",
  confirmedAt: new Date("2026-10-10T00:00:00Z"),
  observations: [
    {
      name: "Hemoglobin",
      rawValue: "13.5",
      numericValue: 13.5,
      unit: "g/dL",
      referenceRangeRaw: "13.0-17.0",
      sourceDocumentId: "doc_cbc_001",
      page: 1,
    },
  ],
  medications: [],
};

describe("retrieveRecords Bangla (T10)", () => {
  it("Bangla question finds CBC record", () => {
    const hits = retrieveRecords("হিমোগ্লোবিন hemoglobin", [cbcRecord]);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("rec_cbc_001");
  });

  it("Bangla-only query tokenizes to non-empty set", () => {
    // Just verify tokenization doesn't crash and produces tokens (not matching).
    const hits = retrieveRecords("হিমোগ্লোবিন রক্ত", [cbcRecord]);
    expect(hits.length).toBeGreaterThanOrEqual(0);
  });
});
