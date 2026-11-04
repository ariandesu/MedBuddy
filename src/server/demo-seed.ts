import { randomUUID } from "node:crypto";
import {
  daysAgoISODate,
} from "@/server/dates";
import type { Repository } from "@/server/repo/types";
import type {
  DemoBundle,
  DemoBundleDocument,
  DemoBundleExtraction,
  DemoBundleRecord,
  DemoBundleWellness,
} from "@/server/repo/types";
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

type FixtureSet = {
  documents: typeof documentsFixture;
  extractions: typeof extractionsFixture;
  records: typeof recordsFixture;
  wellness: typeof wellnessFixture;
  summary: typeof summaryFixture;
};

async function loadFixtures(profileId?: string): Promise<FixtureSet> {
  if (!isDemoProfileId(profileId)) {
    return {
      documents: documentsFixture,
      extractions: extractionsFixture,
      records: recordsFixture,
      wellness: wellnessFixture,
      summary: summaryFixture,
    };
  }
  // Dynamic import keeps the default fixture path unchanged for tests.
  // Loaded once per profile in demo-profiles.ts (cached there).
  const bundle = await loadProfileBundle(profileId as DemoProfileId);
  return bundle as unknown as FixtureSet;
}

/**
 * Build a fully-linked bundle with pre-generated ids, so a repo can insert it
 * with one round-trip per collection. Pure function of the fixtures.
 */
function prepareBundle(
  userId: string,
  fx: FixtureSet,
): { bundle: DemoBundle; docIdMap: Map<string, string>; recordIdMap: Map<string, string> } {
  const docIdMap = new Map<string, string>();
  const recordIdMap = new Map<string, string>();
  const now = Date.now();

  const documents: DemoBundleDocument[] = fx.documents.map((d, i) => {
    const id = randomUUID();
    docIdMap.set(d.id, id);
    return {
      id,
      userId,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: samplePaperSize(d.fileRef) ?? d.sizeBytes,
      checksum: d.checksum,
      fileRef: d.fileRef,
      status: d.status as DocumentStatus,
      // Stagger so newest-first sort matches fixture order (as today, where
      // each createDocument call lands a few ms apart in fixture order).
      createdAt: new Date(now - (fx.documents.length - i)),
    };
  });

  const extractions: DemoBundleExtraction[] = [];
  for (const e of fx.extractions) {
    const newDocId = docIdMap.get(e.documentId);
    if (!newDocId) continue;
    extractions.push({
      id: randomUUID(),
      userId,
      documentId: newDocId,
      documentType: e.documentType as DocumentType,
      documentDateRaw: e.documentDateRaw,
      documentDate:
        e.documentDateDaysAgo === null
          ? null
          : daysAgoISODate(e.documentDateDaysAgo),
      dateNeedsReview: e.documentDateDaysAgo === null,
      fields: withSampleBoxes(
        fx.documents.find((d) => d.id === e.documentId)?.fileRef ?? "",
        e.fields as ExtractedField[]
      ),
      ocrText: e.ocrText,
      createdAt: new Date(now),
    });
  }

  const records: DemoBundleRecord[] = [];
  for (const r of fx.records) {
    const newDocId = docIdMap.get(r.documentId);
    if (!newDocId) continue;
    const id = randomUUID();
    recordIdMap.set(r.id, id);
    const observations = (r.observations as Observation[]).map((obs) => ({
      ...obs,
      sourceDocumentId: newDocId,
    }));
    records.push({
      id,
      userId,
      documentId: newDocId,
      recordType: r.recordType as DocumentType,
      recordDate: daysAgoISODate(r.recordDateDaysAgo),
      observations: observations as Observation[],
      medications: r.medications as MedicationAsWritten[],
      confirmedAt: new Date(now),
    });
  }

  const wellness: DemoBundleWellness[] = fx.wellness.map((w) => ({
    id: randomUUID(),
    userId,
    date: daysAgoISODate(w.daysAgo),
    entry: {
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
    },
  }));

  const remappedSourceRecordIds = fx.summary.sourceRecordIds
    .map((id: string) => recordIdMap.get(id))
    .filter((id): id is string => id !== undefined);
  const payload = structuredClone(fx.summary.payload) as HealthSummaryPayload;
  for (const change of payload.observedChanges) {
    change.sourceRecordIds = change.sourceRecordIds
      .map((id: string) => recordIdMap.get(id))
      .filter((id): id is string => id !== undefined);
  }

  return {
    bundle: {
      documents,
      extractions,
      records,
      wellness,
      summary: {
        id: randomUUID(),
        userId,
        version: 1,
        generatedAt: new Date(now),
        coveredFrom: daysAgoISODate(fx.summary.coveredFromDaysAgo),
        coveredTo: daysAgoISODate(fx.summary.coveredToDaysAgo),
        payload,
        sourceRecordIds: remappedSourceRecordIds,
        model: fx.summary.model,
        isSample: fx.summary.isSample,
      },
    },
    docIdMap,
    recordIdMap,
  };
}

/**
 * Seed demo data for a given userId through repository methods only.
 * Works for both MemoryRepository and MongoRepository.
 * When the repo supports bulk insert (Mongo production), the whole bundle goes
 * in ~5 round-trips instead of ~25 sequential writes (each Mongo op costs a
 * full Atlas RTT from serverless). Otherwise falls back to per-item writes.
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
  const fx = await loadFixtures(profileId);

  // Fast path: bulk insert (Mongo production).
  if (repo.insertDemoBundle) {
    const { bundle, docIdMap, recordIdMap } = prepareBundle(userId, fx);
    await repo.insertDemoBundle(userId, bundle);
    return { docIdMap, recordIdMap };
  }

  // Legacy path: per-item writes (Memory demo mode, unit tests).
  // NOTE: sample papers are shared static images — no per-account file bytes.
  const { documents, extractions, records, wellness, summary } = fx;
  const docIdMap = new Map<string, string>();
  const recordIdMap = new Map<string, string>();

  // 1. Documents: createDocument → updateDocumentStatus
  // NOTE: sample papers are shared static images — no per-account file bytes.
  for (const d of documents) {
    const doc = await repo.createDocument({
      userId,
      fileName: d.fileName,
      mimeType: d.mimeType,
      sizeBytes: samplePaperSize(d.fileRef) ?? d.sizeBytes,
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
  for (const e of extractions) {
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
      dateNeedsReview: e.documentDateDaysAgo === null,
      fields: withSampleBoxes(
        documents.find((d) => d.id === e.documentId)?.fileRef ?? "",
        e.fields as ExtractedField[]
      ),
      ocrText: e.ocrText,
    });
  }

  // 3. Medical records: createMedicalRecord with remapped documentId
  for (const r of records) {
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
  for (const w of wellness) {
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
