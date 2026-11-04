import { normalizeDigits } from "@/lib/digits";

/**
 * Document dates, decided in code rather than trusted from the model (AGENTS.md §6).
 * Numeric dates default to dd/mm (Bangladesh). When the day and month could swap,
 * the person has to look at the paper before the record is saved.
 */

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function toISO(year: number, month: number, day: number): string | null {
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : null;
}

export type ParsedDate = {
  date: string;
  /** The other reading when day and month could swap, otherwise null. */
  alternate: string | null;
  needsReview: boolean;
};

/** Parse a date as written on paper. Bangla digits are fine. Null if it isn't numeric. */
export function parseNumericDate(raw: string | null | undefined): ParsedDate | null {
  if (!raw) return null;
  const text = normalizeDigits(raw);

  const yearFirst = text.match(/(?<!\d)(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})(?!\d)/);
  if (yearFirst) {
    const date = toISO(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
    return date ? { date, alternate: null, needsReview: false } : null;
  }

  const m = text.match(/(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})(?!\d)/);
  if (!m) return null;
  const first = Number(m[1]);
  const second = Number(m[2]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const dayFirst = toISO(year, second, first);
  const monthFirst = toISO(year, first, second);

  if (dayFirst && monthFirst && first !== second) {
    return { date: dayFirst, alternate: monthFirst, needsReview: true };
  }
  if (dayFirst) return { date: dayFirst, alternate: null, needsReview: false };
  // Only readable as mm/dd, which is unusual here: use it, but ask.
  if (monthFirst) return { date: monthFirst, alternate: null, needsReview: true };
  return null;
}

/**
 * The date to store for a new extraction. The written date wins over the model's
 * reading. Anything code can't verify (no date, a written-out month, a future date)
 * needs the person's check.
 */
export function resolveDocumentDate(
  raw: string | null | undefined,
  modelDate: string | null | undefined,
  today: string
): { date: string | null; needsReview: boolean } {
  const parsed = parseNumericDate(raw);
  if (parsed) {
    return { date: parsed.date, needsReview: parsed.needsReview || parsed.date > today };
  }
  return { date: modelDate && isValidISODate(modelDate) ? modelDate : null, needsReview: true };
}
