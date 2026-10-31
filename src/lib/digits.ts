/**
 * Normalize Bengali digits (U+09E6–U+09EF: ০১২৩৪৫৬৭৮৯) to ASCII digits.
 * Devanagari digits (U+0966–U+096F) are NOT converted.
 */
export function normalizeDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
}
