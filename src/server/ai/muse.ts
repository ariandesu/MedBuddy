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

/**
 * Strip markdown code-fence wrappers (```json ... ```) that the model may
 * wrap around its JSON output, then return the raw JSON string.
 */
function stripMarkdown(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\n([\s\S]*?)\n```$/);
  return match ? match[1] : trimmed;
}

/**
 * Extract JSON from free-text model output.
 * Tries direct parse, then first { ... last } substring.
 */
function extractJson(raw: string): unknown {
  const cleaned = stripMarkdown(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error(`Model did not return JSON: ${cleaned.slice(0, 120)}`);
  }
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
    _reasoningEffort: "low" | "medium",
    schemaName: string
  ): Promise<T> {
    const client = this.getClient();
    const model = getMuseModel();
    const lastError: unknown[] = [];
    // NOTE: Meta endpoint rejects the `reasoning` param (400 unknown parameter),
    // so effort is accepted for API compat but not sent. See DECISIONS.md.
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages,
          response_format: chatResponseFormat(schemaName, jsonSchema),
          store: false,
        });
        const raw = completion.choices[0]?.message.content ?? "";
        return schema.parse(extractJson(raw));
      } catch (err) {
        lastError.push(err);
      }
    }
    throw new Error(
      "Muse extraction failed: " +
        lastError.map((e) => (e instanceof Error ? e.message : String(e))).join("; ")
    );
  }

  private async chatWithParts<T>(
    schema: z.ZodType<T>,
    parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
    systemContent: string,
    schemaName: string
  ): Promise<T> {
    const client = this.getClient();
    const model = getMuseModel();
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    // Try structured output first; fall back to plain-text JSON parse.
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: parts },
        ],
        response_format: chatResponseFormat(schemaName, jsonSchema),
        store: false,
      });
      const raw = completion.choices[0]?.message.content ?? "";
      return schema.parse(extractJson(raw));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If endpoint rejects response_format with image input, retry without it.
      if (!msg.includes("400")) throw err;
    }
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: parts },
      ],
      store: false,
    });
    const raw = completion.choices[0]?.message.content ?? "";
    return schema.parse(extractJson(raw));
  }

  async extractDocument(
    fileBytes: Buffer,
    mimeType: string,
    ocrText: string,
    documentId: string,
    locale: "bn" | "en" = "en"
  ): Promise<AIExtractionResult> {
    const content = wrapDocument(
      documentId,
      `MIME: ${mimeType}\nOCR text:\n${ocrText}\n`
    );
    const textContent = `Extract all fields from this health document. Return values exactly as written, including Bangla digits. Return ONLY a JSON object with keys documentType ("lab_report"|"prescription"|"other"), documentDateRaw (string|null), documentDate (string|null), fields (array of {key,label,rawValue,numericValue,unit,referenceRangeRaw,page,sources:{muse,ocr},confidence}), ocrText (string). If the image is blank or unreadable, return documentType "other", empty fields, null dates. ${content}`;

    // For images, send multimodal content (image + text). If the endpoint
    // rejects image input (400) or image parse fails, fall back to text-only once.
    if (mimeType.startsWith("image/")) {
      const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
        { type: "text", text: textContent },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${fileBytes.toString("base64")}` },
        },
      ];
      try {
        return await this.chatWithParts(aiExtractionResultSchema, parts, systemPrompt(locale), "extraction_result");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn(`muse: image extraction failed, text-only fallback (${msg.slice(0, 80)})`);
        return this.chat(
          aiExtractionResultSchema,
          [
            { role: "system", content: systemPrompt(locale) },
            { role: "user", content: textContent },
          ],
          REASONING_EFFORT_EXTRACTION,
          "extraction_result"
        );
      }
    }

    return this.chat(
      aiExtractionResultSchema,
      [
        { role: "system", content: systemPrompt(locale) },
        { role: "user", content: textContent },
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
