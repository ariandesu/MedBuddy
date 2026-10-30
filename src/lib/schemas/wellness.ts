import { z } from "zod";

export const energySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type Energy = z.infer<typeof energySchema>;

export const symptomLevelSchema = z.enum([
  "none",
  "mild",
  "moderate",
  "severe",
]);
export type SymptomLevel = z.infer<typeof symptomLevelSchema>;

export const wellnessEntrySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepHours: z.number().min(0).max(24).optional(),
  waterGlasses: z.number().int().min(0).max(30).optional(),
  activityMinutes: z.number().int().min(0).max(1440).optional(),
  energy: energySchema.optional(),
  symptomLevel: symptomLevelSchema.optional(),
  symptoms: z.array(z.string()).optional(),
  note: z.string().max(500).optional(),
});
export type WellnessEntry = z.infer<typeof wellnessEntrySchema>;
