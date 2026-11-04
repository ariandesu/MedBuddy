import { describe, expect, it } from "vitest";
import { weekEstimates } from "@/server/trends";

describe("weekEstimates", () => {
  it("averages only the days that have a value, never counting a missing day as zero", () => {
    const result = weekEstimates([
      { date: "2026-11-01", waterGlasses: 8, activityMinutes: 30, energy: 4 },
      { date: "2026-11-02" },
      { date: "2026-11-03", waterGlasses: 6, activityMinutes: 20, energy: 3 },
    ]);
    expect(result.waterGlasses).toBe(7);
    expect(result.activityMinutes).toBe(25);
    expect(result.energy).toBe(3.5);
  });

  it("rounds, because these are rough figures", () => {
    const result = weekEstimates([
      { date: "2026-11-01", waterGlasses: 7, activityMinutes: 28, energy: 3 },
      { date: "2026-11-02", waterGlasses: 8, activityMinutes: 31, energy: 4 },
      { date: "2026-11-03", waterGlasses: 8, activityMinutes: 33, energy: 3 },
    ]);
    expect(result.waterGlasses).toBe(8);
    expect(result.activityMinutes).toBe(30);
    expect(result.energy).toBe(3.3);
  });

  it("returns nothing rather than a zero when there's no data", () => {
    expect(weekEstimates([])).toEqual({
      waterGlasses: null,
      activityMinutes: null,
      energy: null,
      symptomFreeDays: 0,
      symptomAnsweredDays: 0,
    });
  });

  it("only counts symptom-free days the person actually answered", () => {
    const result = weekEstimates([
      { date: "2026-11-01", symptomLevel: "none" },
      { date: "2026-11-02", symptomLevel: "mild", symptoms: ["cough"] },
      { date: "2026-11-03", symptoms: ["fever"] },
      { date: "2026-11-04", waterGlasses: 7 },
    ]);
    expect(result.symptomAnsweredDays).toBe(3);
    expect(result.symptomFreeDays).toBe(1);
  });
});
