import { normalizeDigits } from "@/lib/digits";

export type ParsedRange = { low: number; high: number };

/**
 * Parse a reference range as printed on a lab report, e.g. "13.0-17.0",
 * "4.0 – 11.0", "১৩.০-১৭.০", "150 to 450". Returns null for anything else
 * ("<200", "negative", empty) — we never guess a range.
 */
export function parseRange(raw: string | null | undefined): ParsedRange | null {
  if (!raw) return null;
  const s = normalizeDigits(raw).replace(/,/g, "");
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const low = Number(m[1]);
  const high = Number(m[2]);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return null;
  return { low, high };
}

export type RangeStatus = "low" | "normal" | "high";

export function rangeStatus(value: number, range: ParsedRange): RangeStatus {
  if (value < range.low) return "low";
  if (value > range.high) return "high";
  return "normal";
}

/**
 * Position (0–100%) of a value on a bar whose middle 50% is the normal range.
 * Values far outside are clamped to the bar ends.
 */
export function positionOnBar(value: number, range: ParsedRange): number {
  const span = range.high - range.low;
  const barMin = range.low - span / 2;
  const barMax = range.high + span / 2;
  const pct = ((value - barMin) / (barMax - barMin)) * 100;
  return Math.min(98, Math.max(2, pct));
}
