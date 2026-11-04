import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getDictionary } from "@/lib/i18n";
import { MemoryRepository } from "@/server/repo/memory";
import { _setRepoForTests } from "@/server/repo/index";
import { _setAIForTests } from "@/server/ai/index";
import type { AIProvider } from "@/server/ai/types";
import { POST } from "@/app/api/ask/route";

const dict = getDictionary("en");

vi.mock("@/server/auth", () => ({
  getSessionUser: async () => ({ id: "user-1", email: "user@example.com" }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getLocaleAndDict: async () => ({ locale: "en", dict: getDictionary("en") }),
}));
vi.mock("@/server/rate-limit", () => ({
  aiRateLimitCheck: async () => ({ allowed: true, remaining: 1 }),
}));

function ask(question: string) {
  return POST(new NextRequest("http://localhost/api/ask", { method: "POST", body: JSON.stringify({ question }) }));
}

function fakeAI(medicine: string | null) {
  const answerMedicineQuestion = vi.fn(async () => ({ answer: "It treats heartburn. Ask your doctor.", limitations: [] }));
  const answerQuestion = vi.fn(async () => ({ answer: "From your records.", citations: [], limitations: [] }));
  const identifyMedicine = vi.fn(async () => ({ medicine }));
  _setAIForTests({ answerMedicineQuestion, answerQuestion, identifyMedicine } as unknown as AIProvider);
  return { answerMedicineQuestion, answerQuestion, identifyMedicine };
}

beforeEach(() => _setRepoForTests(new MemoryRepository({ seed: false })));
afterEach(() => {
  vi.unstubAllGlobals();
  _setAIForTests(null);
  _setRepoForTests(null);
});

describe("POST /api/ask, medicine questions", () => {
  it("answers from the official label and returns its link", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      results: [{ set_id: "abc", indications_and_usage: ["Treats frequent heartburn that occurs two or more days a week."], openfda: { generic_name: ["OMEPRAZOLE"] } }],
    }))));
    const ai = fakeAI("omeprazole");
    const body = await (await ask("What is omeprazole used for?")).json();
    expect(body.answer).toContain("heartburn");
    expect(body.medicineSource.url).toContain("dailymed.nlm.nih.gov");
    expect(ai.answerQuestion).not.toHaveBeenCalled();
    // The wording named it, so no model call was spent finding the name.
    expect(ai.identifyMedicine).not.toHaveBeenCalled();
  });

  it("says so, without inventing an answer, when no official label exists", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    const ai = fakeAI("Napa");
    const body = await (await ask("Tell me about the medicine Napa")).json();
    expect(body.answer).toBe(dict.ask.medicineNotFound.replace("{{name}}", "Napa"));
    expect(body.medicineSource).toBeUndefined();
    expect(body.aboutMedicine).toBe(true);
    expect(ai.answerMedicineQuestion).not.toHaveBeenCalled();
  });

  it("says the source was unreachable when the lookup fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network"); }));
    fakeAI("omeprazole");
    const body = await (await ask("Tell me about the medicine omeprazole")).json();
    expect(body.answer).toBe(dict.ask.medicineUnavailable);
  });

  it("falls through to the records when the question names no medicine", async () => {
    const ai = fakeAI(null);
    await ask("What is hemoglobin?");
    expect(ai.identifyMedicine).toHaveBeenCalled();
    expect(ai.answerMedicineQuestion).not.toHaveBeenCalled();
  });

  it("makes no extra model call for an ordinary record question", async () => {
    const ai = fakeAI("omeprazole");
    await ask("Is my hemoglobin normal?");
    expect(ai.identifyMedicine).not.toHaveBeenCalled();
  });
});
