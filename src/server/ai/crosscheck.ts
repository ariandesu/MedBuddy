import { normalizeDigits } from "@/lib/digits";

export { normalizeDigits };

export function normalizeValue(value: string | null): string | null {
  if (value === null || value === undefined) return null;
  return normalizeDigits(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercased, digit-normalized tokens with surrounding punctuation removed. */
export function tokensOf(text: string): string[] {
  return (normalizeValue(text) ?? "")
    .split(" ")
    .map((t) => t.replace(/^[()[\],:;|=<>*]+|[()[\],:;|=*]+$/g, ""))
    .filter(Boolean);
}

export function ocrTokens(ocrText: string): Set<string> {
  return new Set(tokensOf(ocrText));
}

/** Numbers a value is made of ("<0.5" → 0.5, "13.5 H" → 13.5, "1,200" → 1200). */
export function numbersIn(text: string): string[] {
  return (normalizeDigits(text).replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? []);
}

// Reference ranges and units hold digits too, but they are not the reading.
const NOT_A_READING = /^\d+(?:\.\d+)?-\d|\^|^x\d/;

/** A lone reading such as "13.5", "<0.5" or "130 H", rather than words like "1 tablet". */
export function isNumericValue(value: string): boolean {
  return /^[<>≤≥~]?\s*\d[\d.,]*\s*(h|l|high|low)?$/i.test(normalizeDigits(value).trim());
}

/** Numbers on a line that could be a reading (not ranges or units). */
export function readingsIn(tokens: string[]): string[] {
  return tokens.filter((t) => !NOT_A_READING.test(t)).flatMap(numbersIn);
}

/** True when `value` appears among `tokens` as a whole number or whole words. */
export function tokensContainValue(tokens: string[], value: string): boolean {
  if (isNumericValue(value)) return numbersIn(value).every((n) => readingsIn(tokens).includes(n));
  const words = tokensOf(value);
  return words.length > 0 && words.every((w) => tokens.includes(w));
}

/** Share of the label's words on this line (0 when none). */
export function labelScore(label: string, lineTokens: string[]): number {
  const words = tokensOf(label).filter((w) => w.length > 1);
  if (words.length === 0) return 0;
  return words.filter((w) => lineTokens.includes(w)).length / words.length;
}

const LABEL_MATCH = 0.5;

/** A single digit like "5" appears all over a page, so it proves nothing on its own. */
export function isDistinctive(value: string): boolean {
  return !isNumericValue(value) || numbersIn(value).join("").length >= 2;
}

/**
 * Compare Muse's value with the on-device OCR text (AGENTS.md §7.5). This runs
 * in code on the OCR text itself, so the model can't vouch for its own reading.
 *   - the labelled line holds the value          => match
 *   - the labelled line holds a different number => mismatch, with that reading
 *   - otherwise fall back to the value appearing anywhere on the paper
 * Anything not confirmed by OCR needs a person to check it.
 */
export function crossCheckField(
  field: {
    label?: string;
    rawValue: string;
    numericValue: number | null;
    confidence: number | null;
  },
  ocrText: string
): {
  agreement: "match" | "mismatch" | "single_source";
  needsReview: boolean;
  ocrValue: string | null;
} {
  const raw = field.rawValue?.trim() ?? "";
  const lines = ocrText.split(/\r?\n/).map(tokensOf).filter((l) => l.length > 0);

  let agreement: "match" | "mismatch" | "single_source" = "single_source";
  let ocrValue: string | null = null;

  if (raw && lines.length > 0) {
    const labelled = field.label
      ? lines.filter((l) => labelScore(field.label as string, l) >= LABEL_MATCH)
      : [];
    if (labelled.some((l) => tokensContainValue(l, raw))) {
      agreement = "match";
      ocrValue = raw;
    } else {
      const reading = isNumericValue(raw) ? readingAfterLabel(field.label ?? "", labelled[0]) : null;
      if (reading) {
        agreement = "mismatch";
        ocrValue = reading;
      } else if (isDistinctive(raw) && tokensContainValue(lines.flat(), raw)) {
        agreement = "match";
        ocrValue = raw;
      }
    }
  }

  const unparseable = isNumericValue(raw) && field.numericValue === null;

  const needsReview =
    agreement !== "match" || (field.confidence ?? 1) < 0.8 || unparseable;

  return { agreement, needsReview, ocrValue };
}

/** First reading-like token after the label, e.g. "25O" in "Platelets 25O x10^9/L". */
function readingAfterLabel(label: string, line: string[] | undefined): string | null {
  if (!line) return null;
  const labelWords = new Set(tokensOf(label));
  let lastLabel = -1;
  line.forEach((t, i) => {
    if (labelWords.has(t)) lastLabel = i;
  });
  return line.slice(lastLabel + 1).find((t) => /\d/.test(t) && !NOT_A_READING.test(t)) ?? null;
}
