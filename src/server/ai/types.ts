import type {
  AIExtractionResult,
  AIExplainRecord,
  AIGenerateSummary,
  AIAnswerQuestion,
} from "@/lib/schemas/ai";
import type { MedicalRecord } from "@/lib/schemas/record";

export interface AIProvider {
  extractDocument(
    fileBytes: Buffer,
    mimeType: string,
    ocrText: string,
    documentId: string
  ): Promise<AIExtractionResult>;
  explainRecord(
    record: MedicalRecord,
    locale: "bn" | "en"
  ): Promise<AIExplainRecord>;
  generateSummary(
    records: MedicalRecord[],
    coveredFrom: string,
    coveredTo: string,
    locale: "bn" | "en"
  ): Promise<AIGenerateSummary>;
  answerQuestion(
    question: string,
    context: string,
    locale: "bn" | "en"
  ): Promise<AIAnswerQuestion>;
}
