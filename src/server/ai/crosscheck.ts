import { normalizeDigits } from "@/lib/digits";

export { normalizeDigits };

export function normalizeValue(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  return normalizeDigits(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function ocrTokens(ocrText: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of normalizeValue(ocrText)?.split(/\s+/) ?? []) {
    if (raw) tokens.add(raw);
  }
  return tokens;
}

/**
 * Compare a Muse field value against the OCR text.
 * Returns { agreement, needsReview } per AGENTS.md §7.5:
 *   - mismatch or OCR confidence < 0.8 or unparseable => needsReview = true
 */
export function crossCheckField(
  field: {
    rawValue: string;
    numericValue: number | null;
    confidence: number | null;
    sources: { muse: string | null; ocr: string | null };
  },
  ocrText: string
): {
  agreement: "match" | "mismatch" | "single_source";
  needsReview: boolean;
} {
  const muse = normalizeValue(field.rawValue);
  const ocr = normalizeValue(field.sources.ocr ?? null);
  const museSource = field.sources.muse != null;
  const ocrSource = field.sources.ocr != null;

  let agreement: "match" | "mismatch" | "single_source";
  if (museSource && ocrSource) {
    agreement = muse !== null && muse === ocr ? "match" : "mismatch";
  } else {
    agreement = "single_source";
  }

  const tokens = ocrTokens(ocrText);
  const valueInOCR = muse != null && tokens.has(muse);

  let needsReview = false;
  if (agreement === "mismatch") needsReview = true;
  if ((field.confidence ?? 1) < 0.8) needsReview = true;
  if (museSource && ocrSource && !valueInOCR) needsReview = true;
  // Numeric-sounding raw value that could not be parsed into a number.
  if (
    field.rawValue != null &&
    field.rawValue.trim() !== "" &&
    field.numericValue === null &&
    /\d/.test(normalizeDigits(field.rawValue))
  ) {
    needsReview = true;
  }

  return { agreement, needsReview };
}
