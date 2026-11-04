/**
 * Finds where an extracted value sits on the paper, from the word positions
 * Tesseract gives us on-device. Deterministic: when the spot is unclear it
 * returns null rather than pointing at the wrong number.
 */
import { z } from "zod";
import type { FieldBox } from "@/lib/schemas/extraction";
import {
  isDistinctive,
  isNumericValue,
  labelScore,
  numbersIn,
  readingsIn,
  tokensContainValue,
  tokensOf,
} from "./crosscheck";

/** One OCR word, position as a 0–1 share of the image; `l` is its line number. */
export const ocrWordSchema = z.object({
  t: z.string().max(200),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
  l: z.number().int().min(0),
});
export type OcrWord = z.infer<typeof ocrWordSchema>;

const MAX_WORDS = 5000;

/** Parse the client's word list; a bad list only costs the highlight, not the upload. */
export function parseOcrWords(json: unknown): OcrWord[] {
  if (typeof json !== "string" || !json) return [];
  try {
    const parsed = z.array(ocrWordSchema).max(MAX_WORDS).safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function unionBox(words: OcrWord[]): FieldBox {
  const x = Math.min(...words.map((w) => w.x));
  const y = Math.min(...words.map((w) => w.y));
  return {
    x,
    y,
    w: Math.max(...words.map((w) => w.x + w.w)) - x,
    h: Math.max(...words.map((w) => w.y + w.h)) - y,
  };
}

function matchingWords(line: OcrWord[], value: string): OcrWord[] {
  if (!tokensContainValue(line.flatMap((w) => tokensOf(w.t)), value)) return [];
  if (isNumericValue(value)) {
    const wanted = numbersIn(value);
    return line.filter((w) => readingsIn(tokensOf(w.t)).some((n) => wanted.includes(n)));
  }
  const wanted = tokensOf(value);
  return line.filter((w) => tokensOf(w.t).some((t) => wanted.includes(t)));
}

export function locateField(
  field: { label: string; rawValue: string },
  words: OcrWord[]
): FieldBox | null {
  const raw = field.rawValue?.trim();
  if (!raw || words.length === 0) return null;

  const byLine = new Map<number, OcrWord[]>();
  for (const w of words) byLine.set(w.l, [...(byLine.get(w.l) ?? []), w]);
  const lines = [...byLine.values()];

  const scored = lines
    .map((line) => ({ line, score: labelScore(field.label, line.flatMap((w) => tokensOf(w.t))) }))
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  for (const { line } of scored) {
    const hit = matchingWords(line, raw);
    if (hit.length > 0) return unionBox(hit);
  }

  // No value beside the label. Point at the value only if it's unambiguous on the page.
  const anywhere = lines.map((line) => matchingWords(line, raw)).filter((hit) => hit.length > 0);
  if (anywhere.length === 1 && isDistinctive(raw)) return unionBox(anywhere[0]);

  // Label found but its value misread: the row is still the right place to look.
  return scored[0] ? unionBox(scored[0].line) : null;
}
