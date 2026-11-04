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
import { isDemoProfileId, loadProfileBundle, type DemoProfileId } from "@/server/demo-profiles";
import { samplePaperSize, withSampleBoxes } from "@/server/sample-papers";
import documentsFixture from "../../fixtures/documents.json";
import extractionsFixture from "../../fixtures/extractions.json";
import recordsFixture from "../../fixtures/records.json";
import wellnessFixture from "../../fixtures/wellness.json";
import summaryFixture from "../../fixtures/summary.json";

/**
 * Seed demo data for a given userId through repository methods only.
 * Works for both MemoryRepository and MongoRepository.
 * When profileId is a judge profile, seeds that story; otherwise seeds the
 * classic fixture set (keeps existing tests green).
 * Returns a map of fixture docId → new docId and fixture recordId → new recordId.
 */
export async function seedDemoData(
  repo: Repository,
  userId: string,
  profileId?: string
): Promise<{
  docIdMap: Map<string, string>;
  recordIdMap: Map<string, string>;
}> {
  const useProfile = isDemoProfileId(profileId);
  const documents = useProfile
    ? (await loadProfileBundle(profileId as DemoProfileId)).documents
    : documentsFixture;
  const extractions = useProfile
    ? (await loadProfileBundle(profileId as DemoProfileId)).extractions
    : extractionsFixture;
  const records = useProfile
    ? (await loadProfileBundle(profileId as DemoProfileId)).records
    : recordsFixture;
  const wellness = useProfile
    ? (await loadProfileBundle(profileId as DemoProfileId)).wellness
    : wellnessFixture;
  const summary = useProfile
    ? (await loadProfileBundle(profileId as DemoProfileId)).summary
    : summaryFixture;
  const docIdMap = new Map<string, string>();
  const recordIdMap = new Map<string, string>();

  // 1. Documents, in fixture order (lists sort newest-first by creation).
  // Their papers are shared static images, so no file is stored per account.
  const fileRefs = new Map<string, string>();
  for (const d of documents) {
    const doc = await repo.createDocument({
      userId,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: samplePaperSize(d.fileRef) ?? d.sizeBytes,
      checksum: d.checksum,
      fileRef: d.fileRef,
    });
    docIdMap.set(d.id, doc.id);
    fileRefs.set(d.id, d.fileRef);
    await repo.updateDocumentStatus(userId, doc.id, d.status as DocumentStatus);
  }

  // 2–4. Extractions, records and check-ins don't depend on each other's order.
  await Promise.all([
    ...extractions.map(async (e) => {
      const newDocId = docIdMap.get(e.documentId);
      if (!newDocId) return;
      await repo.createExtraction({
        userId,
        documentId: newDocId,
        documentType: e.documentType as DocumentType,
        documentDateRaw: e.documentDateRaw,
        documentDate:
          e.documentDateDaysAgo === null
            ? null
            : daysAgoISODate(e.documentDateDaysAgo),
        fields: withSampleBoxes(fileRefs.get(e.documentId) ?? "", e.fields as ExtractedField[]),
        ocrText: e.ocrText,
      });
    }),
    ...records.map(async (r) => {
      const newDocId = docIdMap.get(r.documentId);
      if (!newDocId) return;
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
    }),
    ...wellness.map((w) =>
      repo.upsertWellnessEntry(userId, daysAgoISODate(w.daysAgo), {
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
      })
    ),
  ]);

  // 5. Health summary: createHealthSummary with remapped sourceRecordIds
  const remappedSourceRecordIds = summary.sourceRecordIds.map(
    (id: string) => recordIdMap.get(id)
  ).filter((id): id is string => id !== undefined);

  // Deep-clone payload and remap every observedChanges[].sourceRecordIds
  const payload = structuredClone(summary.payload) as HealthSummaryPayload;
  for (const change of payload.observedChanges) {
    change.sourceRecordIds = change.sourceRecordIds
      .map((id: string) => recordIdMap.get(id))
      .filter((id): id is string => id !== undefined);
  }

  await repo.createHealthSummary({
    userId,
    coveredFrom: daysAgoISODate(summary.coveredFromDaysAgo),
    coveredTo: daysAgoISODate(summary.coveredToDaysAgo),
    payload,
    sourceRecordIds: remappedSourceRecordIds,
    model: summary.model,
    isSample: summary.isSample,
  });

  return { docIdMap, recordIdMap };
}
