import { describe, expect, it } from "vitest";
import { MemoryRepository } from "@/server/repo/memory";
import { seedDemoData } from "@/server/demo-seed";
import { DEMO_PROFILES } from "@/server/demo-profiles";

describe("demo profiles (5 judges)", () => {
  it("all 5 profiles seed 3 docs, 2 records, valid summary", async () => {
    expect(DEMO_PROFILES).toHaveLength(5);
    const recovering = DEMO_PROFILES.filter((p) => p.badge === "recovering");
    const stable = DEMO_PROFILES.filter((p) => p.badge === "stable");
    expect(recovering).toHaveLength(3);
    expect(stable).toHaveLength(2);

    for (const p of DEMO_PROFILES) {
      const repo = new MemoryRepository({ seed: false, userId: `u_${p.id}` });
      await seedDemoData(repo, `u_${p.id}`, p.id);
      const docs = await repo.listDocuments(`u_${p.id}`);
      expect(docs).toHaveLength(3);
      const needsReview = docs.filter((d) => d.status === "needs_review");
      expect(needsReview.length).toBeGreaterThanOrEqual(1);
      const records = await repo.listMedicalRecords(`u_${p.id}`);
      expect(records).toHaveLength(2);
      const summary = await repo.getLatestHealthSummary(`u_${p.id}`);
      expect(summary).not.toBeNull();
      for (const id of summary!.sourceRecordIds) {
        expect(await repo.getMedicalRecord(`u_${p.id}`, id)).not.toBeNull();
      }
    }
  });

  it("classic seeding still gives 4 docs, 2 records (old tests)", async () => {
    const repo = new MemoryRepository({ seed: false, userId: "u_classic" });
    await seedDemoData(repo, "u_classic");
    expect(await repo.listDocuments("u_classic")).toHaveLength(4);
    expect(await repo.listMedicalRecords("u_classic")).toHaveLength(2);
  });
});
