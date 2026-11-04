import { describe, expect, it } from "vitest";
import {
  crossCheckField,
  normalizeDigits,
  normalizeValue,
} from "@/server/ai/crosscheck";

// Bengali digits (U+09E6..U+09EF): ২=\u09e8 ০=\u09e6 ১=\u09e7 ৩=\u09e9
const BN_201 = "\u09e8\u09e6\u09e7";
const BN_130H = "\u09e7\u09e9\u09e6 H";

describe("cross-check (M5)", () => {
  it("normalizes Bengali digits to ASCII", () => {
    expect(normalizeDigits(BN_201)).toBe("201");
    expect(normalizeValue(BN_201)).toBe("201");
    expect(normalizeDigits("১২.৫")).toBe("12.5");
  });

  it("value on the labelled line => match, no review", () => {
    const r = crossCheckField(
      { label: "Hemoglobin", rawValue: "13.5", numericValue: 13.5, confidence: 0.98 },
      "Hemoglobin 13.5 g/dL 13.0-17.0"
    );
    expect(r).toEqual({ agreement: "match", needsReview: false, ocrValue: "13.5" });
  });

  it("Bangla raw vs ASCII OCR token => match", () => {
    const r = crossCheckField(
      { label: "Total Cholesterol", rawValue: BN_201, numericValue: 201, confidence: 0.9 },
      "Total Cholesterol 201 mg/dL"
    );
    expect(r.agreement).toBe("match");
    expect(r.needsReview).toBe(false);
  });

  it("a different reading on the labelled line => mismatch, showing what OCR read", () => {
    const r = crossCheckField(
      { label: "Platelets", rawValue: "250", numericValue: 250, confidence: 0.82 },
      "WBC 7.2 x10^9/L\nPlatelets 25O x10^9/L 150-450"
    );
    expect(r).toEqual({ agreement: "mismatch", needsReview: true, ocrValue: "25o" });
  });

  it("the model's own account of the row can't cause a false mismatch", () => {
    // Regression: rows like "Hemoglobin 11.2 g/dL 13.0-17.0" in sources flagged every correct value.
    const r = crossCheckField(
      {
        label: "Hemoglobin",
        rawValue: "11.2",
        numericValue: 11.2,
        confidence: 0.99,
        sources: { muse: "Hemoglobin 11.2 g/dL 13.0-17.0", ocr: "Hemoglobin 11.2 g/dL 13.0-17.0" },
      } as Parameters<typeof crossCheckField>[0],
      "Hemoglobin 11.2 g/dL 13.0-17.0"
    );
    expect(r.agreement).toBe("match");
  });

  it("a range or unit never counts as the reading", () => {
    const r = crossCheckField(
      { label: "Platelets", rawValue: "450", numericValue: 450, confidence: 0.9 },
      "Platelets 4S0 x10^9/L 150-450"
    );
    expect(r.agreement).toBe("mismatch");
  });

  it("low confidence => review even when readings match", () => {
    const r = crossCheckField(
      { label: "LDL", rawValue: BN_130H, numericValue: 130, confidence: 0.65 },
      "LDL 130 H"
    );
    expect(r.agreement).toBe("match");
    expect(r.needsReview).toBe(true);
  });

  it("not confirmed by OCR => single source, needs review", () => {
    const missing = crossCheckField(
      { label: "Medicine 1 name", rawValue: "Napa 500mg", numericValue: null, confidence: 0.9 },
      "unreadable scrawl"
    );
    expect(missing).toEqual({ agreement: "single_source", needsReview: true, ocrValue: null });
    const noOcr = crossCheckField({ label: "WBC", rawValue: "7.2", numericValue: 7.2, confidence: 0.9 }, "");
    expect(noOcr.agreement).toBe("single_source");
    expect(noOcr.needsReview).toBe(true);
  });

  it("words found anywhere on the paper => match; a lone digit proves nothing", () => {
    const words = crossCheckField(
      { label: "Medicine 1 frequency", rawValue: "twice daily", numericValue: null, confidence: 0.9 },
      "Napa 500mg\nTake twice daily"
    );
    expect(words.agreement).toBe("match");
    const digit = crossCheckField({ label: "Grade", rawValue: "5", numericValue: 5, confidence: 0.9 }, "Page 5 of 9");
    expect(digit.agreement).toBe("single_source");
  });

  it("numeric-looking value with no parsed number => review", () => {
    const r = crossCheckField({ label: "WBC", rawValue: "7.2", numericValue: null, confidence: 0.9 }, "WBC 7.2");
    expect(r.needsReview).toBe(true);
  });
});
