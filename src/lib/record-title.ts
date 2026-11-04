import { formatDate } from "@/lib/digits";
import type { Dictionary, Locale } from "@/lib/i18n";

/** A saved paper's name in words: "Lab report, 1 Nov 2026". */
export function recordTitle(
  record: { recordType: string; recordDate: string | null },
  dict: Dictionary,
  locale: Locale
): string {
  const type = dict.recordType[record.recordType as keyof typeof dict.recordType] ?? dict.recordType.other;
  return record.recordDate ? `${type}, ${formatDate(record.recordDate, locale)}` : type;
}
