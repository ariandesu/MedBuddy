import { describe, expect, it } from "vitest";
import { previousObservation } from "@/lib/range";

const lab = (recordDate: string | null, name: string, numericValue: number | null, unit: string | null = "g/dL") => ({
  recordType: "lab_report",
  recordDate,
  observations: [{ name, rawValue: String(numericValue), numericValue, unit }],
});

describe("previousObservation", () => {
  const current = { name: "Hemoglobin", unit: "g/dL" };

  it("returns the newest earlier value of the same test", () => {
    const records = [lab("2026-11-01", "Hemoglobin", 10.7), lab("2026-09-01", "Hemoglobin", 8), lab("2026-10-15", "Hemoglobin", 9.1)];
    expect(previousObservation(records, current, "2026-11-01")).toEqual({ value: 9.1, rawValue: "9.1", date: "2026-10-15" });
  });

  it("returns null with no earlier value", () => {
    expect(previousObservation([lab("2026-11-01", "Hemoglobin", 10.7)], current, "2026-11-01")).toBeNull();
    expect(previousObservation([lab("2026-11-20", "Hemoglobin", 12)], current, "2026-11-01")).toBeNull();
  });

  it("never compares a different test, a different unit, or a value it couldn't parse", () => {
    const records = [lab("2026-10-01", "WBC", 7), lab("2026-10-02", "Hemoglobin", 91, "g/L"), lab("2026-10-03", "Hemoglobin", null)];
    expect(previousObservation(records, current, "2026-11-01")).toBeNull();
  });

  it("ignores undated records and non-lab records, and an undated current value has no previous", () => {
    const rx = { ...lab("2026-10-01", "Hemoglobin", 9), recordType: "prescription" };
    expect(previousObservation([lab(null, "Hemoglobin", 9), rx], current, "2026-11-01")).toBeNull();
    expect(previousObservation([lab("2026-10-01", "Hemoglobin", 9)], current, null)).toBeNull();
  });
});
