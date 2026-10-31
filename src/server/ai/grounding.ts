/**
 * Grounding helpers (AGENTS.md §9).
 * Retrieval is plain keyword/field matching over confirmed records + latest
 * summary (no vector DB). The grounding filter drops any claim whose
 * sourceRecordIds/citations reference IDs that were not actually sent or do
 * not belong to the user, and adds a limitation note.
 */
import type { MedicalRecord } from "@/lib/schemas/record";
import type { HealthSummary } from "@/lib/schemas/summary";
import type { ObservedChange } from "@/lib/schemas/summary";

import { normalizeDigits } from "@/lib/digits";

function tokens(text: string): Set<string> {
  return new Set(
    normalizeDigits(text)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 1)
  );
}

function recordText(r: MedicalRecord): string {
  const parts = [r.recordType, r.recordDate ?? ""];
  for (const o of r.observations) {
    parts.push(o.name, o.rawValue, o.unit ?? "", o.referenceRangeRaw ?? "");
  }
  for (const m of r.medications) {
    parts.push(
      m.nameAsWritten,
      m.doseAsWritten,
      m.frequencyAsWritten,
      m.durationAsWritten
    );
  }
  return parts.join(" ");
}

/** Keyword retrieval: records whose text shares tokens with the query. */
export function retrieveRecords(
  query: string,
  records: MedicalRecord[],
  limit = 10
): MedicalRecord[] {
  const qt = tokens(query);
  if (qt.size === 0) return [];
  const scored = records
    .map((r) => ({ r, score: intersectionSize(qt, tokens(recordText(r))) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map((x) => x.r);
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

/** Build context text for the model from retrieved records + latest summary. */
export function buildContext(
  records: MedicalRecord[],
  summary: HealthSummary | null
): string {
  const parts: string[] = [];
  for (const r of records) {
    parts.push(`RECORD id=${r.id} ${recordText(r)}`);
  }
  if (summary) {
    parts.push(`SUMMARY id=${summary.id} ${summary.payload.summary}`);
    for (const c of summary.payload.observedChanges) {
      parts.push(`CHANGE ${c.description}`);
    }
  }
  return parts.join("\n");
}

/**
 * Grounding filter for summary observedChanges: drop claims whose
 * sourceRecordIds are not all in `allowed` (sent + user-owned), and append a
 * limitation note for dropped claims.
 */
export function groundSummaryChanges(
  changes: ObservedChange[],
  allowed: Set<string>
): { changes: ObservedChange[]; limitationNote: string | null } {
  const kept: ObservedChange[] = [];
  let dropped = 0;
  for (const c of changes) {
    const valid = c.sourceRecordIds.length > 0 && c.sourceRecordIds.every((id) => allowed.has(id));
    if (valid) kept.push(c);
    else dropped++;
  }
  const note =
    dropped > 0
      ? `Dropped ${dropped} unsourced claim(s) that could not be grounded in your records.`
      : null;
  return { changes: kept, limitationNote: note };
}

/** Grounding filter for Q&A citations: keep only ids in `allowed`. */
export function groundCitations(citations: string[], allowed: Set<string>): string[] {
  return citations.filter((id) => allowed.has(id));
}
