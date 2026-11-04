import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanMedicineName, lookupMedicine, mightAskAboutMedicine, namedMedicine } from "@/server/medicine/lookup";

const USES = "Treats frequent heartburn that occurs two or more days a week.";

function stubFda(byField: { generic?: unknown[]; brand?: unknown[]; status?: number }) {
  const fetchMock = vi.fn(async (url: string) => {
    if (byField.status) return new Response("{}", { status: byField.status });
    const results = url.includes("brand_name") ? byField.brand : byField.generic;
    return results?.length
      ? new Response(JSON.stringify({ results }), { status: 200 })
      : new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("cleanMedicineName", () => {
  it("strips doses, forms and uncertainty marks", () => {
    expect(cleanMedicineName("Omeprazole 20mg")).toBe("omeprazole");
    expect(cleanMedicineName("Iron (?) 200 mg tablet")).toBe("iron");
  });

  it("maps an ingredient to its other official name, but leaves a brand alone", () => {
    expect(cleanMedicineName("Paracetamol 500mg")).toBe("acetaminophen");
    expect(cleanMedicineName("Napa")).toBe("napa");
  });

  it("rejects anything with nothing safe to search for", () => {
    expect(cleanMedicineName("৫০০")).toBeNull();
    expect(cleanMedicineName("x")).toBeNull();
  });
});

describe("lookupMedicine", () => {
  it("returns the label's uses and an official source link, and never dosing", async () => {
    stubFda({
      generic: [{
        set_id: "abc-123",
        indications_and_usage: [USES],
        warnings: ["Ask a doctor before use."],
        dosage_and_administration: ["Take 1 tablet daily."],
        openfda: { generic_name: ["OMEPRAZOLE"], pharm_class_epc: ["Proton Pump Inhibitor [EPC]"] },
      }],
    });
    const result = await lookupMedicine("omeprazole");
    expect(result.status).toBe("found");
    if (result.status !== "found") return;
    expect(result.label.uses).toBe(USES);
    expect(result.label.medicineClass).toBe("Proton Pump Inhibitor");
    expect(result.label.sourceUrl).toBe("https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=abc-123");
    expect(JSON.stringify(result.label)).not.toContain("Take 1 tablet");
  });

  it("skips combination products and labels with no real usage text", async () => {
    stubFda({
      generic: [
        { set_id: "combo", indications_and_usage: [USES], openfda: { generic_name: ["SITAGLIPTIN AND METFORMIN HYDROCHLORIDE"] } },
        { set_id: "empty", purpose: ["SUGGESTED USE:"], openfda: { generic_name: ["METFORMIN HYDROCHLORIDE"] } },
        { set_id: "right", indications_and_usage: [USES], openfda: { generic_name: ["METFORMIN HYDROCHLORIDE"] } },
      ],
    });
    const result = await lookupMedicine("metformin");
    expect(result.status === "found" && result.label.sourceUrl).toContain("setid=right");
  });

  it("only searches real medicines, so homeopathic labels never answer", async () => {
    const fetchMock = stubFda({});
    await lookupMedicine("ferrous sulfate");
    expect(fetchMock.mock.calls[0][0]).toContain("_exists_:openfda.rxcui");
  });

  it("says not found for a local brand, never guessing a generic", async () => {
    stubFda({});
    expect(await lookupMedicine("Napa")).toEqual({ status: "not_found" });
  });

  it("tells a failed lookup apart from a missing medicine", async () => {
    stubFda({ status: 500 });
    expect(await lookupMedicine("omeprazole")).toEqual({ status: "unavailable" });
  });

  it("sends only the medicine's name", async () => {
    const fetchMock = stubFda({});
    await lookupMedicine("omeprazole");
    for (const [url] of fetchMock.mock.calls) {
      expect(url).toMatch(/^https:\/\/api\.fda\.gov\/drug\/label\.json\?search=/);
      expect(url).toContain("omeprazole");
    }
  });
});

describe("mightAskAboutMedicine", () => {
  it("catches medicine questions in both languages", () => {
    for (const q of ["What is omeprazole used for?", "side effects of iron", "what is napa", "ওমিপ্রাজল কিসের ওষুধ?", "এই ট্যাবলেট কেন খাই?"]) {
      expect(mightAskAboutMedicine(q)).toBe(true);
    }
  });

  it("lets ordinary record questions skip the extra model call", () => {
    for (const q of ["Is my hemoglobin normal?", "How much did I sleep last week?", "আমার হিমোগ্লোবিন কি স্বাভাবিক?"]) {
      expect(mightAskAboutMedicine(q)).toBe(false);
    }
  });
});

describe("namedMedicine", () => {
  it("reads the name when the wording makes it certain", () => {
    expect(namedMedicine("What is omeprazole used for?")).toBe("omeprazole");
    expect(namedMedicine("side effects of Napa?")).toBe("Napa");
    expect(namedMedicine("What does metformin do?")).toBe("metformin");
  });

  it("leaves everything else to the model, so a lab test is never searched as a medicine", () => {
    expect(namedMedicine("What is hemoglobin?")).toBeNull();
    expect(namedMedicine("ওমিপ্রাজল কিসের ওষুধ?")).toBeNull();
  });
});
