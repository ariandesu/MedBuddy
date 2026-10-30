import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MemoryRepository } from "@/server/repo/memory";
import { MongoRepository } from "@/server/repo/mongo";
import type {
  Repository,
  CreateExtractionInput,
  WellnessUpsertInput,
} from "@/server/repo/types";
import type { ExtractedField } from "@/lib/schemas";

function field(overrides: Partial<ExtractedField> = {}): ExtractedField {
  return {
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
    ...overrides,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function runContractSuite(
  name: string,
  makeRepo: () => Promise<{ repo: Repository; cleanup: () => Promise<void> }>
) {
  describe(`Repository contract: ${name}`, () => {
    let repo: Repository;
    let cleanup: () => Promise<void>;
    let userA = "";
    let userB = "";

    beforeAll(async () => {
      const r = await makeRepo();
      repo = r.repo;
      cleanup = r.cleanup;
      const a = await repo.createUser({
        email: "a@example.com",
        passwordHash: "hash-a",
        locale: "en",
      });
      const b = await repo.createUser({
        email: "b@example.com",
        passwordHash: "hash-b",
        locale: "bn",
      });
      userA = a.id;
      userB = b.id;
    }, 180000);

    afterAll(async () => {
      await cleanup();
    });

    it("users: create/get and unique email", async () => {
      const u = await repo.getUserByEmail("A@EXAMPLE.COM");
      expect(u?.id).toBe(userA);
      expect(await repo.getUserById(userB)).toMatchObject({
        email: "b@example.com",
      });
      expect(await repo.getUserByEmail("missing@example.com")).toBeNull();
      await expect(
        repo.createUser({
          email: "a@example.com",
          passwordHash: "x",
          locale: "en",
        })
      ).rejects.toThrow();
    });

    it("documents: CRUD + ownership + newest-first list", async () => {
      const d1 = await repo.createDocument({
        userId: userA,
        fileName: "a1.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        checksum: "c1",
        fileRef: "f-a1",
      });
      expect(d1.status).toBe("uploaded");
      await sleep(15);
      const d2 = await repo.createDocument({
        userId: userA,
        fileName: "a2.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 20,
        checksum: "c2",
        fileRef: "f-a2",
      });
      await sleep(15);
      await repo.createDocument({
        userId: userB,
        fileName: "b1.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 30,
        checksum: "c3",
        fileRef: "f-b1",
      });
      expect(await repo.getDocument(userA, d1.id)).toMatchObject({
        fileName: "a1.jpg",
      });
      expect(await repo.getDocument(userB, d1.id)).toBeNull();
      expect(await repo.getDocument(userA, "nope")).toBeNull();
      const list = await repo.listDocuments(userA);
      expect(list.map((d) => d.id)).toEqual([d2.id, d1.id]);
      const updated = await repo.updateDocumentStatus(
        userA,
        d1.id,
        "needs_review"
      );
      expect(updated?.status).toBe("needs_review");
      expect(await repo.updateDocumentStatus(userB, d1.id, "failed")).toBeNull();
    });

    it("files: roundtrip + ownership", async () => {
      const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
      await repo.storeFile(userA, "f-x", bytes, "image/jpeg", "x.jpg");
      const got = await repo.getFile(userA, "f-x");
      expect(got?.mimeType).toBe("image/jpeg");
      expect(got?.fileName).toBe("x.jpg");
      expect(Buffer.compare(got!.bytes, bytes)).toBe(0);
      expect(await repo.getFile(userB, "f-x")).toBeNull();
      expect(await repo.getFile(userA, "missing")).toBeNull();
    });

    it("extractions: CRUD + ownership + by-document", async () => {
      const input: CreateExtractionInput = {
        userId: userA,
        documentId: "doc-1",
        documentType: "lab_report",
        documentDateRaw: "10/10/2026",
        documentDate: "2026-10-10",
        fields: [field()],
        ocrText: "hello",
      };
      const ext = await repo.createExtraction(input);
      expect(await repo.getExtraction(userA, ext.id)).toMatchObject({
        documentId: "doc-1",
      });
      expect(await repo.getExtraction(userB, ext.id)).toBeNull();
      expect(
        await repo.getExtractionByDocument(userA, "doc-1")
      ).toMatchObject({ id: ext.id });
      expect(await repo.getExtractionByDocument(userB, "doc-1")).toBeNull();
      const updated = await repo.updateExtractionFields(userA, ext.id, [
        field({ key: "wbc", userEdited: true }),
      ]);
      expect(updated?.fields[0].key).toBe("wbc");
      expect(updated?.fields[0].userEdited).toBe(true);
      expect(
        await repo.updateExtractionFields(userB, ext.id, [field()])
      ).toBeNull();
    });

    it("records: CRUD + date filter + ownership", async () => {
      const r1 = await repo.createMedicalRecord({
        userId: userA,
        documentId: "doc-1",
        recordType: "lab_report",
        recordDate: "2026-10-01",
        observations: [
          {
            name: "Hb",
            rawValue: "13.5",
            numericValue: 13.5,
            unit: "g/dL",
            referenceRangeRaw: null,
            sourceDocumentId: "doc-1",
            page: 1,
          },
        ],
        medications: [],
      });
      await repo.createMedicalRecord({
        userId: userA,
        documentId: "doc-2",
        recordType: "prescription",
        recordDate: "2026-10-20",
        observations: [],
        medications: [
          {
            nameAsWritten: "Napa",
            doseAsWritten: "1",
            frequencyAsWritten: "daily",
            durationAsWritten: "7d",
            uncertain: false,
          },
        ],
      });
      await repo.createMedicalRecord({
        userId: userB,
        documentId: "doc-3",
        recordType: "other",
        recordDate: "2026-10-10",
        observations: [],
        medications: [],
      });
      expect(await repo.getMedicalRecord(userA, r1.id)).toMatchObject({
        recordDate: "2026-10-01",
      });
      expect(await repo.getMedicalRecord(userB, r1.id)).toBeNull();
      const all = await repo.listMedicalRecords(userA);
      expect(all).toHaveLength(2);
      expect(all[0].recordDate).toBe("2026-10-01");
      const filtered = await repo.listMedicalRecords(userA, {
        from: "2026-10-15",
        to: "2026-10-25",
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].recordType).toBe("prescription");
    });

    it("wellness: upsert + range + ownership", async () => {
      const w1: WellnessUpsertInput = { sleepHours: 7, energy: 3 };
      const created = await repo.upsertWellnessEntry(userA, "2026-10-01", w1);
      expect(created.sleepHours).toBe(7);
      const updated = await repo.upsertWellnessEntry(userA, "2026-10-01", {
        waterGlasses: 8,
      });
      expect(updated.id).toBe(created.id);
      expect(updated.sleepHours).toBe(7);
      expect(updated.waterGlasses).toBe(8);
      await repo.upsertWellnessEntry(userA, "2026-10-03", { energy: 2 });
      await repo.upsertWellnessEntry(userB, "2026-10-02", { energy: 4 });
      const list = await repo.listWellnessEntries(
        userA,
        "2026-10-01",
        "2026-10-31"
      );
      expect(list.map((w) => w.date)).toEqual(["2026-10-01", "2026-10-03"]);
      const empty = await repo.listWellnessEntries(
        userA,
        "2026-09-01",
        "2026-09-30"
      );
      expect(empty).toHaveLength(0);
    });

    it("summaries: versioning + latest + ownership", async () => {
      const base = {
        coveredFrom: "2026-10-01",
        coveredTo: "2026-10-20",
        payload: {
          summary: "s",
          observedChanges: [],
          missingInformation: [],
          questionsForDoctor: [],
          limitations: [],
        },
        sourceRecordIds: [] as string[],
        model: "fixture",
        isSample: true,
      };
      const v1 = await repo.createHealthSummary({ userId: userA, ...base });
      expect(v1.version).toBe(1);
      await sleep(15);
      const v2 = await repo.createHealthSummary({ userId: userA, ...base });
      expect(v2.version).toBe(2);
      await repo.createHealthSummary({ userId: userB, ...base });
      expect(await repo.getHealthSummary(userA, v1.id)).toMatchObject({
        version: 1,
      });
      expect(await repo.getHealthSummary(userB, v1.id)).toBeNull();
      expect(await repo.getLatestHealthSummary(userA)).toMatchObject({
        version: 2,
      });
      const list = await repo.listHealthSummaries(userA);
      expect(list.map((s) => s.version)).toEqual([2, 1]);
    });
  });
}

runContractSuite("MemoryRepository", async () => ({
  repo: new MemoryRepository({ seed: false }),
  cleanup: async () => {},
}));

runContractSuite("MongoRepository", async () => {
  const mongod = await MongoMemoryServer.create();
  const repo = new MongoRepository(mongod.getUri(), "contract_test");
  return {
    repo,
    cleanup: async () => {
      await repo.close();
      await mongod.stop();
    },
  };
});
