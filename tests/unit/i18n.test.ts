import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/en.json";
import bn from "@/lib/i18n/bn.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && !Array.isArray(v)
      ? flatten(v as Record<string, unknown>, key)
      : [key];
  });
}

describe("i18n key consistency (T24)", () => {
  it("en and bn have exactly the same key set", () => {
    const enKeys = flatten(en).sort();
    const bnKeys = flatten(bn).sort();
    expect(bnKeys).toEqual(enKeys);
  });
});

describe("Bangla dictionary script hygiene", () => {
  function values(obj: Record<string, unknown>, prefix = ""): [string, string][] {
    return Object.entries(obj).flatMap(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      return typeof v === "object" && v !== null
        ? values(v as Record<string, unknown>, key)
        : [[key, String(v)] as [string, string]];
    });
  }

  it("bn strings contain only Bengali, ASCII and common punctuation", () => {
    // Allowed: ASCII, Bengali block, Devanagari danda (।, the Bangla full stop),
    // and typographic punctuation. Anything else (Hebrew, Arabic, Hangul,
    // Devanagari letters…) is a corrupted translation.
    const allowed = /^[\x20-\x7Eঀ-৿।॥–—…‘’“”·≤≥×°৳\n]*$/u;
    const bad = values(bn).filter(([, v]) => !allowed.test(v));
    expect(bad).toEqual([]);
  });
});
