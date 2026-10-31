import { describe, expect, it } from "vitest";
import { isRedFlag } from "@/lib/safety/redflags";

describe("isRedFlag (T14)", () => {
  it("severe symptomLevel => true", () => {
    expect(isRedFlag({ symptomLevel: "severe" })).toBe(true);
  });

  it("red-flag symptom => true", () => {
    expect(isRedFlag({ symptomLevel: "none", symptoms: ["chest pain"] })).toBe(true);
    expect(isRedFlag({ symptomLevel: "mild", symptoms: ["stroke signs"] })).toBe(true);
  });

  it("non-red-flag symptom => false", () => {
    expect(isRedFlag({ symptomLevel: "none", symptoms: ["cough"] })).toBe(false);
    expect(isRedFlag({ symptomLevel: "mild", symptoms: ["headache"] })).toBe(false);
    expect(isRedFlag({ symptomLevel: "none", symptoms: [] })).toBe(false);
  });
});
