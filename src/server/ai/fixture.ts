import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AIProvider } from "./types";
import type {
  AIExtractionResult,
  AIExplainRecord,
  AIGenerateSummary,
  AIAnswerQuestion,
  AIIdentifyMedicine,
  AIMedicineAnswer,
} from "@/lib/schemas/ai";
import type { MedicalRecord } from "@/lib/schemas/record";
import type { MedicineLabel } from "@/server/medicine/lookup";

const FIXTURE_DIR = join(process.cwd(), "fixtures", "ai");

function loadFixture<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export class FixtureAI implements AIProvider {
  async extractDocument(
    fileBytes: Buffer,
    mimeType: string,
    ocrText: string,
    documentId: string,
    _locale: "bn" | "en"
  ): Promise<AIExtractionResult> {
    const byId: Record<string, AIExtractionResult> =
      (loadFixture("extraction", {
        default: {
          documentType: "other",
          documentDateRaw: null,
          documentDate: null,
          fields: [],
          ocrText: "",
        },
      }) as unknown) as Record<string, AIExtractionResult>;
    const result = byId[documentId] ?? byId.default;
    return {
      ...result,
      ocrText: result.ocrText || ocrText,
    };
  }

  async explainRecord(
    _record: MedicalRecord,
    _locale: "bn" | "en"
  ): Promise<AIExplainRecord> {
    return loadFixture("explain", {
      plainLanguage: "Sample explanation (demo).",
      keyPoints: [],
      questionsForDoctor: [],
      limitations: ["Fixture output — not a real interpretation."],
    });
  }

  async generateSummary(
    _records: MedicalRecord[],
    _coveredFrom: string,
    _coveredTo: string,
    _locale: "bn" | "en"
  ): Promise<AIGenerateSummary> {
    return loadFixture("summary", {
      summary: "Sample summary (demo).",
      observedChanges: [],
      missingInformation: [],
      questionsForDoctor: [],
      limitations: ["Fixture output — not a real summary."],
    });
  }

  async answerQuestion(
    _question: string,
    _context: string,
    _locale: "bn" | "en"
  ): Promise<AIAnswerQuestion> {
    return loadFixture("answer", {
      answer: "I couldn't find this in your records (demo).",
      citations: [],
      limitations: ["Fixture output — not a real answer."],
    });
  }

  async identifyMedicine(_question: string): Promise<AIIdentifyMedicine> {
    // The sample AI can't read a question, so it never starts a medicine lookup.
    return { medicine: null };
  }

  async answerMedicineQuestion(
    _question: string,
    label: MedicineLabel,
    _locale: "bn" | "en"
  ): Promise<AIMedicineAnswer> {
    return { answer: `SAMPLE — From the official label: ${label.uses}`, limitations: ["SAMPLE — Muse isn't connected, so this text isn't simplified."] };
  }
}
