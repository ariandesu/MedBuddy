import { describe, expect, it } from "vitest";
import { locateField, parseOcrWords, type OcrWord } from "@/server/ai/locate";
import { inferCitations, stripRecordIds } from "@/server/ai/grounding";
import type { MedicalRecord } from "@/lib/schemas/record";

function row(l: number, ...texts: string[]): OcrWord[] {
  return texts.map((t, i) => ({ t, x: i * 0.2, y: l * 0.1, w: 0.1, h: 0.05, l }));
}

const PAGE = [
  ...row(0, "Hemoglobin", "11.2", "g/dL", "13.0-17.0"),
  ...row(1, "WBC", "9.4", "x10^9/L", "4.0-11.0"),
  ...row(2, "Platelets", "25O", "x10^9/L", "150-450"),
  ...row(3, "Take", "twice", "daily"),
];

describe("locateField", () => {
  it("boxes the value on the labelled line", () => {
    const box = locateField({ label: "WBC", rawValue: "9.4" }, PAGE);
    expect(box?.x).toBeCloseTo(0.2);
    expect(box?.y).toBeCloseTo(0.1);
    expect(box?.w).toBeCloseTo(0.1);
  });

  it("matches Bangla digits against ASCII OCR", () => {
    expect(locateField({ label: "Hemoglobin", rawValue: "১১.২" }, PAGE)?.y).toBe(0);
  });

  it("does not mistake a range or unit for the value", () => {
    // 150 is only in Platelets' range; no reading says 150, so point at the row, not the range.
    const box = locateField({ label: "Platelets", rawValue: "150" }, PAGE);
    expect(box?.y).toBeCloseTo(0.2);
    expect(box?.w).toBeCloseTo(0.7);
  });

  it("spans multi-word values", () => {
    const box = locateField({ label: "Medicine 1 frequency", rawValue: "twice daily" }, PAGE);
    expect(box?.x).toBeCloseTo(0.2);
    expect(box?.w).toBeCloseTo(0.3);
  });

  it("returns null rather than guess", () => {
    expect(locateField({ label: "Glucose", rawValue: "7.7" }, PAGE)).toBeNull();
    expect(locateField({ label: "WBC", rawValue: "" }, PAGE)).toBeNull();
    expect(locateField({ label: "WBC", rawValue: "9.4" }, [])).toBeNull();
  });

  it("parseOcrWords ignores malformed input", () => {
    expect(parseOcrWords("not json")).toEqual([]);
    expect(parseOcrWords(JSON.stringify([{ t: "x" }]))).toEqual([]);
    expect(parseOcrWords(null)).toEqual([]);
    expect(parseOcrWords(JSON.stringify(row(0, "ok")))).toHaveLength(1);
  });
});

describe("citation backstops", () => {
  const record = (id: string, recordDate: string, rawValue: string, nameAsWritten = "") =>
    ({
      id,
      recordDate,
      observations: [{ name: "Hemoglobin", rawValue }],
      medications: nameAsWritten ? [{ nameAsWritten }] : [],
    }) as unknown as MedicalRecord;

  it("strips internal ids from shown text", () => {
    expect(stripRecordIds("A lab report [record 6aead82d10023a6f3ef8a547] lists it.")).toBe("A lab report lists it.");
    expect(stripRecordIds("Hemoglobin 13.5 on 2026-10-15")).toBe("Hemoglobin 13.5 on 2026-10-15");
  });

  it("cites only records the answer visibly quotes", () => {
    const records = [
      record("a", "2026-10-15", "13.5"),
      record("b", "2026-11-03", "১১.২"),
      record("c", "2026-09-01", "15.1"),
      record("d", "2026-08-01", "9", "Napa 500mg"),
    ];
    expect(inferCitations("On 2026-10-15 it was high. Later it was ১১.২. Take napa 500mg.", records)).toEqual(["a", "b", "d"]);
  });
});
