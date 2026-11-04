import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { MemoryRepository } from "@/server/repo/memory";
import { _setRepoForTests } from "@/server/repo/index";
import { _setAIForTests } from "@/server/ai/index";
import { todayISODate } from "@/server/dates";
import { processDocumentExtraction } from "@/server/extract-document";
import type { AIProvider } from "@/server/ai/types";
import type { Document } from "@/lib/schemas";
import { POST as generate } from "@/app/api/summaries/generate/route";
import { PATCH as patchExtraction } from "@/app/api/extractions/[id]/route";
import { POST as confirm } from "@/app/api/extractions/[id]/confirm/route";

const USER = "user_audit";
const OTHER = "user_other";
let locale: "en" | "bn" = "en";

vi.mock("@/server/auth", () => ({
  getSessionUser: async () => ({ id: "user_audit", email: "a@example.test" }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getLocale: async () => locale,
  getLocaleAndDict: async () => ({ locale, dict: getDictionary(locale) }),
}));

const extractionResult = {
  documentType: "lab_report" as const,
  documentDateRaw: "03/11/2026",
  documentDate: "2026-11-03",
  fields: [],
  ocrText: "",
};
const summaryResult = {
  summary: "Summary.",
  observedChanges: [],
  missingInformation: [],
  questionsForDoctor: ["From the model?"],
  limitations: [],
};

function stubAI(generateSummary = vi.fn(async () => summaryResult)): AIProvider {
  return {
    extractDocument: async () => extractionResult,
    explainRecord: async () => {
      throw new Error("unused");
    },
    generateSummary,
    identifyMedicine: async () => ({ medicine: null }),
    answerMedicineQuestion: async () => ({ answer: "", limitations: [] }),
    answerQuestion: async () => {
      throw new Error("unused");
    },
  };
}

const req = (url: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method: body === undefined ? "POST" : "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("document date review", () => {
  let repo: MemoryRepository;
  let doc: Document;

  async function extract() {
    await processDocumentExtraction({
      userId: USER,
      doc,
      buf: Buffer.from("x"),
      mime: "image/jpeg",
      clientOcrText: "",
      locale: "en",
    });
    return (await repo.getExtractionByDocument(USER, doc.id))!;
  }

  beforeEach(async () => {
    repo = new MemoryRepository({ seed: false, userId: USER });
    _setRepoForTests(repo);
    _setAIForTests(stubAI());
    doc = await repo.createDocument({
      userId: USER,
      fileName: "a.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1,
      checksum: "c",
      fileRef: "r",
    });
  });

  it("flags a swappable date on extraction", async () => {
    const ext = await extract();
    expect(ext.documentDateRaw).toBe("03/11/2026");
    expect(ext.documentDate).toBe("2026-11-03");
    expect(ext.dateNeedsReview).toBe(true);
  });

  it("blocks confirm until the date is checked", async () => {
    const ext = await extract();
    const res = await confirm(req(`/x`), params(ext.id));
    expect(res.status).toBe(409);
    expect(await repo.listMedicalRecords(USER)).toHaveLength(0);
  });

  it("saves the corrected date on the record", async () => {
    const ext = await extract();
    const patched = await patchExtraction(
      req(`/x`, { fields: [], documentDate: "2026-03-11", dateChecked: true }),
      params(ext.id)
    );
    expect(patched.status).toBe(200);
    const res = await confirm(req(`/x`), params(ext.id));
    expect(res.status).toBe(200);
    const [record] = await repo.listMedicalRecords(USER);
    expect(record.recordDate).toBe("2026-03-11");
  });

  it("lets a person save a paper as undated", async () => {
    const ext = await extract();
    await patchExtraction(
      req(`/x`, { fields: [], documentDate: null, dateChecked: true }),
      params(ext.id)
    );
    expect((await confirm(req(`/x`), params(ext.id))).status).toBe(200);
    const [record] = await repo.listMedicalRecords(USER);
    expect(record.recordDate).toBeNull();
  });

  it("an edit without dateChecked keeps the block", async () => {
    const ext = await extract();
    await patchExtraction(req(`/x`, { fields: [], documentDate: "2026-03-11" }), params(ext.id));
    expect((await confirm(req(`/x`), params(ext.id))).status).toBe(409);
  });

  it("rejects an impossible date", async () => {
    const ext = await extract();
    const res = await patchExtraction(
      req(`/x`, { fields: [], documentDate: "2026-02-30", dateChecked: true }),
      params(ext.id)
    );
    expect(res.status).toBe(400);
  });

  it("older extractions without the flag aren't blocked", async () => {
    const legacy = await repo.createExtraction({
      userId: USER,
      documentId: doc.id,
      documentType: "lab_report",
      documentDateRaw: "03/11/2026",
      documentDate: "2026-11-03",
      fields: [],
      ocrText: "",
    });
    expect((await confirm(req(`/x`), params(legacy.id))).status).toBe(200);
  });

  it("can't change another user's date", async () => {
    const theirs = await repo.createExtraction({
      userId: OTHER,
      documentId: "doc-other",
      documentType: "lab_report",
      documentDateRaw: null,
      documentDate: "2026-01-01",
      fields: [],
      ocrText: "",
    });
    const res = await patchExtraction(
      req(`/x`, { fields: [], documentDate: "2026-03-11", dateChecked: true }),
      params(theirs.id)
    );
    expect(res.status).toBe(404);
    expect((await repo.getExtraction(OTHER, theirs.id))?.documentDate).toBe("2026-01-01");
  });
});

describe("summary generation with check-ins", () => {
  let repo: MemoryRepository;
  let generateSummary: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    locale = "en";
    repo = new MemoryRepository({ seed: false, userId: USER });
    _setRepoForTests(repo);
    generateSummary = vi.fn(async () => summaryResult);
    _setAIForTests(stubAI(generateSummary as never));
    await repo.createMedicalRecord({
      userId: USER,
      documentId: "d1",
      recordType: "lab_report",
      recordDate: "2026-01-15",
      observations: [],
      medications: [],
    });
  });

  it("sends computed check-ins and covers their dates", async () => {
    const today = todayISODate();
    await repo.upsertWellnessEntry(USER, today, { sleepHours: 7 });
    const res = await generate(req("/x"));
    expect(res.status).toBe(201);
    const wellness = generateSummary.mock.calls[0][4];
    expect(wellness).toMatchObject({ daysWithCheckin: 1, daysMissing: 29, averages: { sleepHours: 7 } });
    const summary = await res.json();
    expect(summary.coveredFrom).toBe("2026-01-15");
    expect(summary.coveredTo).toBe(today);
  });

  it("sends nothing when there are no check-ins, and adds no question", async () => {
    const res = await generate(req("/x"));
    expect(generateSummary.mock.calls[0][4]).toBeNull();
    expect((await res.json()).payload.questionsForDoctor).toEqual(["From the model?"]);
  });

  it("does not read another user's check-ins", async () => {
    await repo.upsertWellnessEntry(OTHER, todayISODate(), { symptoms: ["chest pain"] });
    await generate(req("/x"));
    expect(generateSummary.mock.calls[0][4]).toBeNull();
  });

  it("an urgent check-in reaches the doctor questions whatever the model wrote", async () => {
    await repo.upsertWellnessEntry(USER, todayISODate(), { symptoms: ["chest pain", "headache"] });
    const qs = (await (await generate(req("/x"))).json()).payload.questionsForDoctor;
    expect(qs).toHaveLength(2);
    expect(qs[0]).toContain("Chest pain");
    expect(qs[1]).toBe("From the model?");
  });

  it("the urgent question is translated", async () => {
    locale = "bn";
    await repo.upsertWellnessEntry(USER, todayISODate(), { symptomLevel: "severe" });
    const qs = (await (await generate(req("/x"))).json()).payload.questionsForDoctor;
    expect(qs[0]).toContain("গুরুতর");
    expect(qs[0]).not.toContain("{{");
  });
});
