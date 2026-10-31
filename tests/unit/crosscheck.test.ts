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
