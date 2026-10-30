import { describe, expect, it } from "vitest";
import { MemoryRepository } from "@/server/repo/memory";
import { seedDemoData } from "@/server/demo-seed";

describe("seedDemoData (T2)", () => {
  it("seeds 4 documents, 2 records, and a summary with valid sourceRecordIds", async () => {
    const repo = new MemoryRepository({ seed: false, userId: "user_demo_1" });
    await seedDemoData(repo, "user_demo_1");

    const docs = await repo.listDocuments("user_demo_1");
    expect(docs).toHaveLength(4);

    const records = await repo.listMedicalRecords("user_demo_1");
    expect(records).toHaveLength(2);

    const summary = await repo.getLatestHealthSummary("user_demo_1");
    expect(summary).not.toBeNull();
    expect(summary!.isSample).toBe(true);
    // Every sourceRecordId must point to an existing record
    for (const id of summary!.sourceRecordIds) {
      const rec = await repo.getMedicalRecord("user_demo_1", id);
      expect(rec).not.toBeNull();
    }
    // Every observedChanges[].sourceRecordIds must also point to existing records
    for (const change of summary!.payload.observedChanges) {
      for (const id of change.sourceRecordIds) {
        const rec = await repo.getMedicalRecord("user_demo_1", id);
        expect(rec).not.toBeNull();
      }
    }
  });

  it("second user sees 0 documents", async () => {
    const repo = new MemoryRepository({ seed: false, userId: "user_demo_1" });
    await seedDemoData(repo, "user_demo_1");

    const docs = await repo.listDocuments("user_demo_2");
    expect(docs).toHaveLength(0);

    const records = await repo.listMedicalRecords("user_demo_2");
    expect(records).toHaveLength(0);

    const summary = await repo.getLatestHealthSummary("user_demo_2");
    expect(summary).toBeNull();
  });
});
