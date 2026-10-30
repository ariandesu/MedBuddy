import {
  daysAgoISODate,
} from "@/server/dates";
import type { Repository } from "@/server/repo/types";
import type {
  DocumentStatus,
  DocumentType,
  ExtractedField,
  Observation,
  MedicationAsWritten,
  HealthSummaryPayload,
} from "@/lib/schemas";
import documentsFixture from "../../fixtures/documents.json";
import extractionsFixture from "../../fixtures/extractions.json";
import recordsFixture from "../../fixtures/records.json";
import wellnessFixture from "../../fixtures/wellness.json";
import summaryFixture from "../../fixtures/summary.json";

// Placeholder 1x1 PNG bytes used for fixture files (content is never served).
const PLACEHOLDER_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * Seed demo data for a given userId through repository methods only.
 * Works for both MemoryRepository and MongoRepository.
 * Returns a map of fixture docId → new docId and fixture recordId → new recordId.
 */
export async function seedDemoData(
  repo: Repository,
  userId: string
): Promise<{
  docIdMap: Map<string, string>;
  recordIdMap: Map<string, string>;
}> {
  const docIdMap = new Map<string, string>();
  const recordIdMap = new Map<string, string>();

  // 1. Documents: storeFile → createDocument → updateDocumentStatus
  for (const d of documentsFixture) {
    await repo.storeFile(
      userId,
      d.fileRef,
      PLACEHOLDER_BYTES,
      d.mimeType,
      d.fileName
    );
    const doc = await repo.createDocument({
      userId,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      checksum: d.checksum,
      fileRef: d.fileRef,
    });
    await repo.updateDocumentStatus(
      userId,
      doc.id,
      d.status as DocumentStatus
    );
    docIdMap.set(d.id, doc.id);
  }

  // 2. Extractions: createExtraction with remapped documentId
  for (const e of extractionsFixture) {
    const newDocId = docIdMap.get(e.documentId);
    if (!newDocId) continue;
    const doc = await repo.getDocument(userId, newDocId);
    if (!doc) continue;
    await repo.createExtraction({
      userId,
      documentId: newDocId,
      documentType: e.documentType as DocumentType,
      documentDateRaw: e.documentDateRaw,
      documentDate:
        e.documentDateDaysAgo === null
          ? null
          : daysAgoISODate(e.documentDateDaysAgo),
      fields: e.fields as ExtractedField[],
      ocrText: e.ocrText,
    });
  }

  // 3. Medical records: createMedicalRecord with remapped documentId
  for (const r of recordsFixture) {
    const newDocId = docIdMap.get(r.documentId);
    if (!newDocId) continue;
    const observations = (r.observations as Observation[]).map((obs) => ({
      ...obs,
      sourceDocumentId: newDocId,
    }));
    const rec = await repo.createMedicalRecord({
      userId,
      documentId: newDocId,
      recordType: r.recordType as DocumentType,
      recordDate: daysAgoISODate(r.recordDateDaysAgo),
      observations: observations as Observation[],
      medications: r.medications as MedicationAsWritten[],
    });
    recordIdMap.set(r.id, rec.id);
  }

  // 4. Wellness entries: upsertWellnessEntry
  for (const w of wellnessFixture) {
    await repo.upsertWellnessEntry(userId, daysAgoISODate(w.daysAgo), {
      sleepHours: w.sleepHours,
      waterGlasses: w.waterGlasses,
      activityMinutes: w.activityMinutes,
      energy: w.energy as 1 | 2 | 3 | 4,
      symptomLevel: w.symptomLevel as
        | "none"
        | "mild"
        | "moderate"
        | "severe",
      symptoms: w.symptoms,
      note: w.note,
    });
  }

  // 5. Health summary: createHealthSummary with remapped sourceRecordIds
  const remappedSourceRecordIds = summaryFixture.sourceRecordIds.map(
    (id: string) => recordIdMap.get(id)
  ).filter((id): id is string => id !== undefined);

  // Deep-clone payload and remap every observedChanges[].sourceRecordIds
  const payload = structuredClone(summaryFixture.payload) as HealthSummaryPayload;
  for (const change of payload.observedChanges) {
    change.sourceRecordIds = change.sourceRecordIds
      .map((id: string) => recordIdMap.get(id))
      .filter((id): id is string => id !== undefined);
  }

  await repo.createHealthSummary({
    userId,
    coveredFrom: daysAgoISODate(summaryFixture.coveredFromDaysAgo),
    coveredTo: daysAgoISODate(summaryFixture.coveredToDaysAgo),
    payload,
    sourceRecordIds: remappedSourceRecordIds,
    model: summaryFixture.model,
    isSample: summaryFixture.isSample,
  });

  return { docIdMap, recordIdMap };
}
