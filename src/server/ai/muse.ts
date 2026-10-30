import { OpenAI } from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat";
import { z } from "zod";
import {
  getModelApiKey,
  getMuseBaseUrl,
  getMuseModel,
} from "@/server/env";
import { AIProvider } from "./types";
import { systemPrompt, wrapDocument } from "./prompts";
import {
  AIExtractionResult,
  aiExtractionResultSchema,
  AIExplainRecord,
  aiExplainRecordSchema,
  AIGenerateSummary,
  aiGenerateSummarySchema,
  AIAnswerQuestion,
  aiAnswerQuestionSchema,
} from "@/lib/schemas/ai";
import type { MedicalRecord } from "@/lib/schemas/record";

const REASONING_EFFORT_EXTRACTION = "low";
const REASONING_EFFORT_SUMMARY = "medium";

function chatResponseFormat(name: string, schema: unknown) {
  return {
    type: "json_schema" as const,
    json_schema: {
      name,
      schema: schema as Record<string, unknown>,
      strict: true,
    },
  };
}

export class MuseAI implements AIProvider {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = getModelApiKey();
      const baseURL = getMuseBaseUrl();
      if (!apiKey) throw new Error("MODEL_API_KEY not set");
      this.client = new OpenAI({ apiKey, baseURL });
    }
    return this.client;
  }

  private async chat<T>(
    schema: z.ZodType<T>,
    messages: ChatCompletionMessageParam[],
    reasoningEffort: "low" | "medium",
    schemaName: string
  ): Promise<T> {
    const client = this.getClient();
    const model = getMuseModel();
    const lastError: unknown[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages,
          response_format: chatResponseFormat(schemaName, schema),
          store: false,
          ...(reasoningEffort
            ? { reasoning: { effort: reasoningEffort } }
            : {}),
        });
        const raw = completion.choices[0]?.message.content ?? "";
        return schema.parse(JSON.parse(raw));
      } catch (err) {
        lastError.push(err);
      }
    }
    throw new Error(
      "Muse extraction failed: " +
        lastError.map((e) => (e instanceof Error ? e.message : String(e))).join("; ")
    );
  }

  async extractDocument(
    fileBytes: Buffer,
    mimeType: string,
    ocrText: string,
    documentId: string
  ): Promise<AIExtractionResult> {
    const content = wrapDocument(
      documentId,
      `MIME: ${mimeType}\nOCR text:\n${ocrText}\n`
    );
    return this.chat(
      aiExtractionResultSchema,
      [
        { role: "system", content: systemPrompt("en") },
        {
          role: "user",
          content: `Extract all fields from this health document. Return values exactly as written, including Bangla digits. ${content}`,
        },
      ],
      REASONING_EFFORT_EXTRACTION,
      "extraction_result"
    );
  }

  async explainRecord(
    record: MedicalRecord,
    locale: "bn" | "en"
  ): Promise<AIExplainRecord> {
    return this.chat(
      aiExplainRecordSchema,
      [
        { role: "system", content: systemPrompt(locale) },
        {
          role: "user",
          content: `Explain this confirmed medical record in plain language. ${wrapDocument(record.id, JSON.stringify(record))}`,
        },
      ],
      "medium",
      "explain_record"
    );
  }

  async generateSummary(
    records: MedicalRecord[],
    coveredFrom: string,
    coveredTo: string,
    locale: "bn" | "en"
  ): Promise<AIGenerateSummary> {
    return this.chat(
      aiGenerateSummarySchema,
      [
        { role: "system", content: systemPrompt(locale) },
        {
          role: "user",
          content: `Generate a source-linked health summary covering ${coveredFrom} to ${coveredTo} from these confirmed records. ${wrapDocument("summary", JSON.stringify({ records, coveredFrom, coveredTo }))}`,
        },
      ],
      REASONING_EFFORT_SUMMARY,
      "generate_summary"
    );
  }

  async answerQuestion(
    question: string,
    context: string,
    locale: "bn" | "en"
  ): Promise<AIAnswerQuestion> {
    return this.chat(
      aiAnswerQuestionSchema,
      [
        { role: "system", content: systemPrompt(locale) },
        {
          role: "user",
          content: `Answer the question using only the supplied context. If the answer is not in the context, say so. Question: ${question}\n\nContext: ${wrapDocument("context", context)}`,
        },
      ],
      "medium",
      "answer_question"
    );
  }
}
