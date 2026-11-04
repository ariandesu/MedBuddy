import { z } from "zod";
import {
  extractedFieldSchema,
  type ExtractedField,
  type FieldBox,
} from "@/lib/schemas/extraction";

/** What the model returns — agreement/needsReview are computed deterministically after. */
export const aiExtractedFieldSchema = extractedFieldSchema.omit({
  agreement: true,
  needsReview: true,
  userEdited: true,
  box: true,
});
export type AIExtractedField = z.infer<typeof aiExtractedFieldSchema>;

export const aiExtractionResultSchema = z.object({
  documentType: z.enum(["lab_report", "prescription", "other"]),
  documentDateRaw: z.string().nullable(),
  documentDate: z.string().nullable(),
  fields: z.array(aiExtractedFieldSchema),
  ocrText: z.string(),
});
export type AIExtractionResult = z.infer<typeof aiExtractionResultSchema>;

export const aiExplainRecordSchema = z.object({
  plainLanguage: z.string(),
  keyPoints: z.array(z.string()),
  questionsForDoctor: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type AIExplainRecord = z.infer<typeof aiExplainRecordSchema>;

export const aiGenerateSummarySchema = z.object({
  summary: z.string(),
  observedChanges: z.array(
    z.object({
      description: z.string(),
      sourceRecordIds: z.array(z.string()),
      uncertainty: z.string(),
    })
  ),
  missingInformation: z.array(z.string()),
  questionsForDoctor: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type AIGenerateSummary = z.infer<typeof aiGenerateSummarySchema>;

export const aiAnswerQuestionSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type AIAnswerQuestion = z.infer<typeof aiAnswerQuestionSchema>;

export const aiIdentifyMedicineSchema = z.object({
  medicine: z.string().nullable(),
});
export type AIIdentifyMedicine = z.infer<typeof aiIdentifyMedicineSchema>;

export const aiMedicineAnswerSchema = z.object({
  answer: z.string(),
  limitations: z.array(z.string()),
});
export type AIMedicineAnswer = z.infer<typeof aiMedicineAnswerSchema>;

export function toExtractedField(
  f: AIExtractedField,
  agreement: "match" | "mismatch" | "single_source",
  needsReview: boolean,
  ocrValue: string | null = null,
  box: FieldBox | null = null
): ExtractedField {
  return {
    ...f,
    // Both readings are set here, never taken from the model's own account of them.
    sources: { muse: f.rawValue, ocr: ocrValue },
    agreement,
    needsReview,
    userEdited: false,
    box,
  };
}
