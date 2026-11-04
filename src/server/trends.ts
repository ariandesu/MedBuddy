/**
 * Deterministic trend calculations (AGENTS.md §9). Never treat missing days as 0.
 */
import { isRedFlag } from "@/lib/safety/redflags";

export type WellnessPoint = {
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
};

export type TrendSeries = {
  name: string;
  points: { date: string; value: number | undefined }[];
};

export function weeklyAverages(entries: WellnessPoint[]): {
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  daysWithData: number;
} {
  const byKey: Record<string, number[]> = {};
  let daysWithData = 0;
  for (const e of entries) {
    if (e.sleepHours != null) (byKey.sleepHours ??= []).push(e.sleepHours);
    if (e.waterGlasses != null) (byKey.waterGlasses ??= []).push(e.waterGlasses);
    if (e.activityMinutes != null)
      (byKey.activityMinutes ??= []).push(e.activityMinutes);
    if (e.sleepHours != null || e.waterGlasses != null || e.activityMinutes != null)
      daysWithData++;
  }
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    sleepHours: byKey.sleepHours?.length ? avg(byKey.sleepHours) : undefined,
    waterGlasses: byKey.waterGlasses?.length ? avg(byKey.waterGlasses) : undefined,
    activityMinutes: byKey.activityMinutes?.length
      ? avg(byKey.activityMinutes)
      : undefined,
    daysWithData,
  };
}

export function deltas(entries: WellnessPoint[]): {
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
} {
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const first = sorted.find((e) => e.sleepHours != null || e.waterGlasses != null || e.activityMinutes != null);
  const last = [...sorted]
    .reverse()
    .find((e) => e.sleepHours != null || e.waterGlasses != null || e.activityMinutes != null);
  const delta = (a?: number, b?: number) =>
    a != null && b != null ? b - a : undefined;
  return {
    sleepHours: delta(first?.sleepHours, last?.sleepHours),
    waterGlasses: delta(first?.waterGlasses, last?.waterGlasses),
    activityMinutes: delta(first?.activityMinutes, last?.activityMinutes),
  };
}

/** Computed check-in facts for the summary. Muse describes these, it never recalculates them. */
export type WellnessDigest = {
  from: string;
  to: string;
  daysInPeriod: number;
  daysWithCheckin: number;
  daysMissing: number;
  averages: { sleepHours?: number; waterGlasses?: number; activityMinutes?: number };
  changeFirstToLast: { sleepHours?: number; waterGlasses?: number; activityMinutes?: number };
  symptomDays: {
    date: string;
    symptomLevel?: string;
    symptoms: string[];
    urgent: boolean;
  }[];
};

type DigestEntry = WellnessPoint & {
  symptomLevel?: "none" | "mild" | "moderate" | "severe";
  symptoms?: string[];
};

const oneDecimal = (n?: number) => (n == null ? undefined : Math.round(n * 10) / 10);

/** Null when there are no check-ins in the period. Notes are left out: they stay in the report. */
export function buildWellnessDigest(
  entries: DigestEntry[],
  from: string,
  to: string
): WellnessDigest | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const avg = weeklyAverages(sorted);
  const change = deltas(sorted);
  const missing = missingDays(sorted, from, to).length;
  return {
    from,
    to,
    daysInPeriod: missing + new Set(sorted.map((e) => e.date)).size,
    daysWithCheckin: sorted.length,
    daysMissing: missing,
    averages: {
      sleepHours: oneDecimal(avg.sleepHours),
      waterGlasses: oneDecimal(avg.waterGlasses),
      activityMinutes: oneDecimal(avg.activityMinutes),
    },
    changeFirstToLast: {
      sleepHours: oneDecimal(change.sleepHours),
      waterGlasses: oneDecimal(change.waterGlasses),
      activityMinutes: oneDecimal(change.activityMinutes),
    },
    symptomDays: sorted
      .filter((e) => (e.symptoms?.length ?? 0) > 0 || (e.symptomLevel && e.symptomLevel !== "none"))
      .map((e) => ({
        date: e.date,
        symptomLevel: e.symptomLevel === "none" ? undefined : e.symptomLevel,
        symptoms: e.symptoms ?? [],
        urgent: isRedFlag(e),
      })),
  };
}

export function series(entries: WellnessPoint[]): TrendSeries[] {
  return [
    { name: "Sleep (hrs)", points: entries.map((e) => ({ date: e.date, value: e.sleepHours })) },
    { name: "Water (glasses)", points: entries.map((e) => ({ date: e.date, value: e.waterGlasses })) },
    { name: "Activity (min)", points: entries.map((e) => ({ date: e.date, value: e.activityMinutes })) },
  ];
}

export function missingDays(
  entries: WellnessPoint[],
  from: string,
  to: string
): string[] {
  const present = new Set(entries.map((e) => e.date));
  const missing: string[] = [];
  let d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    if (!present.has(iso)) missing.push(iso);
    d = new Date(d.getTime() + 86_400_000);
  }
  return missing;
}
