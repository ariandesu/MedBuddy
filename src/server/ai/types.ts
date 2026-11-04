import type {
  AIExtractionResult,
  AIExplainRecord,
  AIGenerateSummary,
  AIAnswerQuestion,
} from "@/lib/schemas/ai";
import type { MedicalRecord } from "@/lib/schemas/record";
import type { WellnessDigest } from "@/server/trends";

export interface AIProvider {
  extractDocument(
    fileBytes: Buffer,
    mimeType: string,
    ocrText: string,
    documentId: string,
    locale: "bn" | "en"
  ): Promise<AIExtractionResult>;
  explainRecord(
    record: MedicalRecord,
    locale: "bn" | "en"
  ): Promise<AIExplainRecord>;
  generateSummary(
    records: MedicalRecord[],
    coveredFrom: string,
    coveredTo: string,
    locale: "bn" | "en",
    wellness?: WellnessDigest | null
  ): Promise<AIGenerateSummary>;
  answerQuestion(
    question: string,
    context: string,
    locale: "bn" | "en"
  ): Promise<AIAnswerQuestion>;
}
