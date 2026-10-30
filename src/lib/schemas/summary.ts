import { z } from "zod";

export const observedChangeSchema = z.object({
  description: z.string().min(1),
  sourceRecordIds: z.array(z.string().min(1)),
  uncertainty: z.string(),
});
export type ObservedChange = z.infer<typeof observedChangeSchema>;

export const healthSummaryPayloadSchema = z.object({
  summary: z.string().min(1),
  observedChanges: z.array(observedChangeSchema),
  missingInformation: z.array(z.string()),
  questionsForDoctor: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type HealthSummaryPayload = z.infer<typeof healthSummaryPayloadSchema>;

export const healthSummarySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  version: z.number().int().positive(),
  generatedAt: z.coerce.date(),
  coveredFrom: z.string(),
  coveredTo: z.string(),
  payload: healthSummaryPayloadSchema,
  sourceRecordIds: z.array(z.string()),
  model: z.string().min(1),
  isSample: z.boolean(),
});
export type HealthSummary = z.infer<typeof healthSummarySchema>;
