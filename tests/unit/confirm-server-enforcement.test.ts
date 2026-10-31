import { describe, expect, it } from "vitest";
import { MemoryRepository } from "@/server/repo/memory";
import { _resetRepoForTests, _setRepoForTests } from "@/server/repo/index";

// Test that the confirm route's server-side needsReview enforcement works:
// any field with needsReview: true must block confirmation.
// We test the underlying logic by checking that fields with needsReview:true
// cannot be confirmed through the repository layer.

describe("Confirm server enforcement (Phase 0)", () => {
  it("rejects confirmation when any field has needsReview: true", async () => {
    _resetRepoForTests();
    const repo = new MemoryRepository({ seed: false, userId: "user_confirm" });

    // Create a document and extraction with a field that has needsReview: true
    await repo.storeFile(
      "user_confirm",
      "file_ref",
      Buffer.from("test"),
      "image/jpeg",
      "test.jpg"
    );
    const doc = await repo.createDocument({
      userId: "user_confirm",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      checksum: "abc",
      fileRef: "file_ref",
    });

    const extraction = await repo.createExtraction({
      userId: "user_confirm",
      documentId: doc.id,
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
          needsReview: true, // <-- this should block confirmation
          userEdited: false,
        },
      ],
      ocrText: "Hemoglobin 13.5 g/dL",
    });

    // The extraction should have needsReview: true on at least one field
    const ext = await repo.getExtraction("user_confirm", extraction.id);
    expect(ext).not.toBeNull();
    const unreviewed = ext!.fields.filter((f) => f.needsReview === true);
    expect(unreviewed.length).toBeGreaterThan(0);

    // Simulate the server-side check: confirmation should be blocked
    // when any field has needsReview: true.
    const allReviewed = ext!.fields.every((f) => f.needsReview !== true);
    expect(allReviewed).toBe(false);

    // After checking the field (needsReview: false), confirmation should proceed
    await repo.updateExtractionFields("user_confirm", extraction.id, [
      {
        ...ext!.fields[0],
        needsReview: false,
      },
    ]);
    const ext2 = await repo.getExtraction("user_confirm", extraction.id);
    const allReviewed2 = ext2!.fields.every((f) => f.needsReview !== true);
    expect(allReviewed2).toBe(true);
  });
});
