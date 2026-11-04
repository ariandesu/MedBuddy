import { describe, expect, it } from "vitest";
import {
  isValidISODate,
  parseNumericDate,
  resolveDocumentDate,
} from "@/lib/document-date";

const TODAY = "2026-11-04";

describe("parseNumericDate", () => {
  it("defaults to dd/mm and flags dates that could swap", () => {
    expect(parseNumericDate("03/11/2026")).toEqual({
      date: "2026-11-03",
      alternate: "2026-03-11",
      needsReview: true,
    });
  });

  it("does not flag a date that can only be dd/mm", () => {
    expect(parseNumericDate("25/10/2026")).toEqual({
      date: "2026-10-25",
      alternate: null,
      needsReview: false,
    });
  });

  it("does not flag when day and month are the same", () => {
    expect(parseNumericDate("05/05/2026")).toEqual({
      date: "2026-05-05",
      alternate: null,
      needsReview: false,
    });
  });

  it("uses mm/dd only when dd/mm is impossible, and asks", () => {
    expect(parseNumericDate("10/25/2026")).toEqual({
      date: "2026-10-25",
      alternate: null,
      needsReview: true,
    });
  });

  it("reads Bangla digits", () => {
    expect(parseNumericDate("২৫/১০/২০২৬")?.date).toBe("2026-10-25");
    expect(parseNumericDate("০৩/১১/২০২৬")?.needsReview).toBe(true);
  });

  it("reads - and . separators, two-digit years and surrounding text", () => {
    expect(parseNumericDate("25-10-2026")?.date).toBe("2026-10-25");
    expect(parseNumericDate("25.10.26")?.date).toBe("2026-10-25");
    expect(parseNumericDate("Date: 25/10/2026")?.date).toBe("2026-10-25");
  });

  it("reads year-first dates without asking", () => {
    expect(parseNumericDate("2026-03-11")).toEqual({
      date: "2026-03-11",
      alternate: null,
      needsReview: false,
    });
  });

  it("rejects impossible and non-numeric dates", () => {
    expect(parseNumericDate("31/02/2026")).toBeNull();
    expect(parseNumericDate("40/40/2026")).toBeNull();
    expect(parseNumericDate("3 Nov 2026")).toBeNull();
    expect(parseNumericDate(null)).toBeNull();
    expect(parseNumericDate("")).toBeNull();
  });
});

describe("resolveDocumentDate", () => {
  it("the written date beats a model that read it as mm/dd", () => {
    expect(resolveDocumentDate("25/10/2026", "2026-01-01", TODAY)).toEqual({
      date: "2026-10-25",
      needsReview: false,
    });
  });

  it("flags a swappable date even when the model agrees", () => {
    expect(resolveDocumentDate("03/11/2026", "2026-11-03", TODAY)).toEqual({
      date: "2026-11-03",
      needsReview: true,
    });
  });

  it("flags a future date", () => {
    expect(resolveDocumentDate("25/12/2026", null, TODAY)).toEqual({
      date: "2026-12-25",
      needsReview: true,
    });
  });

  it("keeps the model's date for a written-out month, but asks", () => {
    expect(resolveDocumentDate("3 Nov 2026", "2026-11-03", TODAY)).toEqual({
      date: "2026-11-03",
      needsReview: true,
    });
  });

  it("drops an invalid model date", () => {
    expect(resolveDocumentDate("sometime", "03/11/2026", TODAY)).toEqual({
      date: null,
      needsReview: true,
    });
  });

  it("asks about a paper with no date at all", () => {
    expect(resolveDocumentDate(null, null, TODAY)).toEqual({ date: null, needsReview: true });
  });
});

describe("isValidISODate", () => {
  it("accepts real dates only", () => {
    expect(isValidISODate("2026-11-04")).toBe(true);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("04/11/2026")).toBe(false);
  });
});
