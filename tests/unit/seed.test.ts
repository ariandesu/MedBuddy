import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { MemoryRepository, DEMO_EMAIL, DEMO_PASSWORD } from "@/server/repo/memory";

describe("MemoryRepository seed (M2)", () => {
  it("seeds demo user with working password", async () => {
    const repo = new MemoryRepository({ seed: true });
    const user = await repo.getUserByEmail(DEMO_EMAIL);
    expect(user).not.toBeNull();
    expect(user!.locale).toBe("bn");
    expect(bcrypt.compareSync(DEMO_PASSWORD, user!.passwordHash)).toBe(true);
  });

  it("seeds documents, extractions, records, wellness, summary", async () => {
    const repo = new MemoryRepository({ seed: true });
    const user = (await repo.getUserByEmail(DEMO_EMAIL))!;
    const docs = await repo.listDocuments(user.id);
    expect(docs).toHaveLength(4);
    expect(docs.filter((d) => d.status === "confirmed")).toHaveLength(2);
    expect(docs.filter((d) => d.status === "needs_review")).toHaveLength(2);

    const ext = await repo.getExtractionByDocument(user.id, "doc_lipid_002");
    expect(ext).not.toBeNull();
    // Bangla digits preserved in rawValue, parsed into numericValue
    expect(ext!.fields[0].rawValue).toBe("২০১");
    expect(ext!.fields[0].numericValue).toBe(201);

    const records = await repo.listMedicalRecords(user.id);
    expect(records).toHaveLength(2);

    const today = new Date().toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(Date.now() - 13 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const wellness = await repo.listWellnessEntries(user.id, twoWeeksAgo, today);
    // 14 days with 2 missing
    expect(wellness).toHaveLength(12);

    const summary = await repo.getLatestHealthSummary(user.id);
    expect(summary).not.toBeNull();
    expect(summary!.version).toBe(1);
    expect(summary!.isSample).toBe(true);

    const file = await repo.getFile(user.id, "file_cbc_001");
    expect(file).not.toBeNull();
    expect(file!.bytes[0]).toBe(0x89); // PNG magic
  });
});
