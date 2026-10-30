import { z } from "zod";

export const agreementSchema = z.enum(["match", "mismatch", "single_source"]);
export type Agreement = z.infer<typeof agreementSchema>;

export const extractedFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  rawValue: z.string(),
  numericValue: z.number().nullable(),
  unit: z.string().nullable(),
  referenceRangeRaw: z.string().nullable(),
  page: z.number().int().positive(),
  sources: z.object({
    muse: z.string().nullable(),
    ocr: z.string().nullable(),
  }),
  agreement: agreementSchema,
  confidence: z.number().min(0).max(1).nullable(),
  needsReview: z.boolean(),
  userEdited: z.boolean(),
});
export type ExtractedField = z.infer<typeof extractedFieldSchema>;

export const documentTypeSchema = z.enum([
  "lab_report",
  "prescription",
  "other",
]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

export const extractionSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  userId: z.string().min(1),
  documentType: documentTypeSchema,
  documentDateRaw: z.string().nullable(),
  documentDate: z.string().nullable(),
  fields: z.array(extractedFieldSchema),
  ocrText: z.string(),
  createdAt: z.coerce.date(),
});
export type Extraction = z.infer<typeof extractionSchema>;
