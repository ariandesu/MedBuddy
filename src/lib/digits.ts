/**
 * Normalize Bengali digits (U+09E6–U+09EF: ০১২৩৪৫৬৭৮৯) to ASCII digits.
 * Devanagari digits (U+0966–U+096F) are NOT converted.
 */
export function normalizeDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Render ASCII digits as Bangla digits when locale is "bn". */
export function toLocaleDigits(s: string, locale: "bn" | "en"): string {
  if (locale !== "bn") return s;
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/**
 * Format an ISO date ("2026-10-19" or full ISO timestamp) for display,
 * e.g. "১৯ অক্টোবর ২০২৬" / "19 Oct 2026". Returns the input on bad dates.
 */
export function formatDate(
  iso: string | Date | null | undefined,
  locale: "bn" | "en",
  opts: { withYear?: boolean } = {}
): string {
  if (!iso) return "";
  const d =
    typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? new Date(`${iso}T00:00:00`)
      : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: locale === "bn" ? "long" : "short",
    ...(opts.withYear === false ? {} : { year: "numeric" }),
  }).format(d);
}
