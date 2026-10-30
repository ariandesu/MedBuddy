import { describe, expect, it } from "vitest";
import {
  crossCheckField,
  normalizeDigits,
  normalizeValue,
} from "@/server/ai/crosscheck";

// Bengali digits as unicode escapes (U+0966..U+096F): ২=\u0968 ০=\u0966 ১=\u0967 ৩=\u0969
const BN_201 = "\u0968\u0966\u0967";
const BN_130H = "\u0967\u0969\u0966 H";

describe("cross-check (M5)", () => {
  it("normalizes Bangla digits to ASCII", () => {
    expect(normalizeDigits(BN_201)).toBe("201");
    expect(normalizeValue(BN_201)).toBe("201");
  });

  it("matching values with both sources => match, no review", () => {
    const r = crossCheckField(
      {
        rawValue: "13.5",
        numericValue: 13.5,
        confidence: 0.98,
        sources: { muse: "13.5", ocr: "13.5" },
      },
      "Hemoglobin 13.5 g/dL"
    );
    expect(r.agreement).toBe("match");
    expect(r.needsReview).toBe(false);
  });

  it("Bangla raw vs ASCII OCR token => match", () => {
    const r = crossCheckField(
      {
        rawValue: BN_201,
        numericValue: 201,
        confidence: 0.9,
        sources: { muse: BN_201, ocr: "201" },
      },
      "Total Cholesterol 201 mg/dL"
    );
    expect(r.agreement).toBe("match");
    expect(r.needsReview).toBe(false);
  });

  it("muse vs OCR differ => mismatch + review", () => {
    const r = crossCheckField(
      {
        rawValue: "250",
        numericValue: 250,
        confidence: 0.82,
        sources: { muse: "250", ocr: "25O" },
      },
      "Platelets 25O x10^9/L"
    );
    expect(r.agreement).toBe("mismatch");
    expect(r.needsReview).toBe(true);
  });

  it("low confidence => review", () => {
    const r = crossCheckField(
      {
        rawValue: BN_130H,
        numericValue: 130,
        confidence: 0.65,
        sources: { muse: BN_130H, ocr: null },
      },
      "LDL 130 H"
    );
    expect(r.agreement).toBe("single_source");
    expect(r.needsReview).toBe(true);
  });
});
