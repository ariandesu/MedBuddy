import { z } from "zod";

export const READING_KINDS = ["blood_pressure", "pulse", "oxygen", "temperature", "weight"] as const;
export type ReadingKind = (typeof READING_KINDS)[number];

/**
 * What a home device could physically show, to catch typing mistakes.
 * These are NOT medical ranges: nothing here says whether a reading is healthy.
 */
export const READING_LIMITS = {
  blood_pressure: { min: 50, max: 300, integer: true },
  bloodPressureLower: { min: 20, max: 200, integer: true },
  pulse: { min: 20, max: 250, integer: true },
  oxygen: { min: 50, max: 100, integer: true },
  temperature: { min: 90, max: 110, integer: false },
  weight: { min: 2, max: 300, integer: false },
} as const;

const inLimits = (limits: { min: number; max: number; integer: boolean }, v: number) =>
  Number.isFinite(v) && v >= limits.min && v <= limits.max && (!limits.integer || Number.isInteger(v));

export const readingInputSchema = z
  .object({
    kind: z.enum(READING_KINDS),
    value: z.number(),
    /** Only blood pressure has a second number, the lower one. */
    value2: z.number().optional(),
  })
  .refine(({ kind, value, value2 }) => {
    if (kind !== "blood_pressure") return value2 === undefined && inLimits(READING_LIMITS[kind], value);
    return (
      value2 !== undefined &&
      inLimits(READING_LIMITS.blood_pressure, value) &&
      inLimits(READING_LIMITS.bloodPressureLower, value2) &&
      value > value2
    );
  });
export type ReadingInput = z.infer<typeof readingInputSchema>;

/** One value per kind per day: entering it again replaces a mistake. */
export const deviceReadingSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(READING_KINDS),
  value: z.number(),
  value2: z.number().optional(),
});
export type DeviceReading = z.infer<typeof deviceReadingSchema>;

/** The newest reading of each kind, in display order. Expects any order of input. */
export function latestReadings<T extends { date: string; kind: ReadingKind }>(readings: T[]): T[] {
  return READING_KINDS.flatMap((kind) => {
    const ofKind = readings.filter((r) => r.kind === kind);
    if (ofKind.length === 0) return [];
    return [ofKind.reduce((newest, r) => (r.date > newest.date ? r : newest))];
  });
}

/** "120/80" or "98.6", in the reader's digits. */
export function formatReading(r: { value: number; value2?: number }, digits: (s: string) => string): string {
  return digits(r.value2 != null ? `${r.value}/${r.value2}` : String(r.value));
}
