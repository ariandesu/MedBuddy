/**
 * The synthetic papers behind seeded demo documents. They live in public/samples
 * (rendered by scripts/make-fixture-images.ts), so seeding a demo account writes
 * no files and every account shares the same images.
 */
import type { ExtractedField, FieldBox } from "@/lib/schemas/extraction";
import manifest from "../../fixtures/sample-papers.json";

type Paper = { sizeBytes: number; boxes: Record<string, FieldBox> };
const papers = manifest as Record<string, Paper>;

export function samplePaperUrl(fileRef: string): string | null {
  return Object.hasOwn(papers, fileRef) ? `/samples/${fileRef}.jpg` : null;
}

export function samplePaperSize(fileRef: string): number | null {
  return Object.hasOwn(papers, fileRef) ? papers[fileRef].sizeBytes : null;
}

/** Attach each value's position on its paper. */
export function withSampleBoxes(fileRef: string, fields: ExtractedField[]): ExtractedField[] {
  const boxes = Object.hasOwn(papers, fileRef) ? papers[fileRef].boxes : {};
  return fields.map((f) => ({ ...f, box: boxes[f.key] ?? null }));
}
