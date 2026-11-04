import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoRepository } from "@/server/repo/mongo";
import { seedDemoData } from "@/server/demo-seed";

let mongod: MongoMemoryServer;
let uri: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  uri = mongod.getUri();
}, 120000);

afterAll(async () => {
  await mongod.stop();
});

describe("demo bulk insert (Mongo fast path)", () => {
  it("bulk-seeded profile matches legacy expectations", async () => {
    const repo = new MongoRepository(uri, "bulk_test");
    try {
      expect(typeof repo.insertDemoBundle).toBe("function");
      const user = await repo.createUser({
        email: "bulk@example.com",
        passwordHash: "x",
        locale: "bn",
      });
      const { docIdMap, recordIdMap } = await seedDemoData(repo, user.id, "anemia-recovery");

      const docs = await repo.listDocuments(user.id);
      expect(docs).toHaveLength(3);
      expect(docs.filter((d) => d.status === "confirmed")).toHaveLength(2);
      expect(docs.filter((d) => d.status === "needs_review")).toHaveLength(1);
      // Newest-first order preserved (fixture order).
      expect(docs[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        docs[docs.length - 1].createdAt.getTime()
      );

      const records = await repo.listMedicalRecords(user.id);
      expect(records).toHaveLength(2);
      const hbValues = records
        .flatMap((r) => r.observations)
        .filter((o) => o.name === "Hemoglobin")
        .map((o) => o.numericValue)
        .sort((a, b) => (a ?? 0) - (b ?? 0));
      expect(hbValues).toEqual([9.1, 10.7]);

      const ext = await repo.getExtractionByDocument(user.id, docIdMap.get("doc_anemia_old")!);
      expect(ext?.fields[0].rawValue).toBe("9.1");

      const wellness = await repo.listWellnessEntries(user.id, "2000-01-01", "2100-01-01");
      expect(wellness).toHaveLength(12);

      const summary = await repo.getLatestHealthSummary(user.id);
      expect(summary?.version).toBe(1);
      expect(summary?.isSample).toBe(true);
      for (const id of summary!.sourceRecordIds) {
        expect(await repo.getMedicalRecord(user.id, id)).not.toBeNull();
      }
      expect(recordIdMap.size).toBe(2);

      // Another user sees nothing (ownership holds on bulk path).
      const other = await repo.createUser({ email: "other@example.com", passwordHash: "x", locale: "en" });
      expect(await repo.listDocuments(other.id)).toHaveLength(0);
      expect(await repo.getLatestHealthSummary(other.id)).toBeNull();
    } finally {
      await repo.close();
    }
  });

  it("default classic seed also goes through bulk on Mongo", async () => {
    const repo = new MongoRepository(uri, "bulk_test_classic");
    try {
      const user = await repo.createUser({ email: "c@example.com", passwordHash: "x", locale: "bn" });
      await seedDemoData(repo, user.id);
      expect(await repo.listDocuments(user.id)).toHaveLength(4);
      expect(await repo.listMedicalRecords(user.id)).toHaveLength(2);
      expect(await repo.getLatestHealthSummary(user.id)).not.toBeNull();
    } finally {
      await repo.close();
    }
  });
});
