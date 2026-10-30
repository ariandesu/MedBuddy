import { z } from "zod";

export const observationSchema = z.object({
  name: z.string().min(1),
  rawValue: z.string(),
  numericValue: z.number().nullable(),
  unit: z.string().nullable(),
  referenceRangeRaw: z.string().nullable(),
  sourceDocumentId: z.string().min(1),
  page: z.number().int().positive(),
});
export type Observation = z.infer<typeof observationSchema>;

export const medicationAsWrittenSchema = z.object({
  nameAsWritten: z.string().min(1),
  doseAsWritten: z.string(),
  frequencyAsWritten: z.string(),
  durationAsWritten: z.string(),
  uncertain: z.boolean(),
});
export type MedicationAsWritten = z.infer<typeof medicationAsWrittenSchema>;

export const recordTypeSchema = z.enum(["lab_report", "prescription", "other"]);
export type RecordType = z.infer<typeof recordTypeSchema>;

export const medicalRecordSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  documentId: z.string().min(1),
  recordType: recordTypeSchema,
  recordDate: z.string().nullable(),
  observations: z.array(observationSchema),
  medications: z.array(medicationAsWrittenSchema),
  confirmedAt: z.coerce.date(),
});
export type MedicalRecord = z.infer<typeof medicalRecordSchema>;
