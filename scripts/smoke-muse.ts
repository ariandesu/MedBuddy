import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MuseAI } from "../src/server/ai/muse";
import { getMuseModel, getMuseBaseUrl } from "../src/server/env";

// Manual live check only (AGENTS.md §4.5). Run at most once per milestone.
// Uses the REAL Muse key — never run from automated tests.
// Prints only status + counts, never secrets or document content.
async function main(): Promise<void> {
  if (!process.env.MODEL_API_KEY) {
    console.error("smoke:muse: MODEL_API_KEY is not set");
    process.exit(1);
  }
  const bytes = readFileSync(join(process.cwd(), "fixtures", "files", "placeholder.png"));
  const ai = new MuseAI();
  const started = Date.now();
  const result = await ai.extractDocument(
    bytes,
    "image/png",
    "SAMPLE smoke test OCR text — not real patient data.",
    "smoke_doc"
  );
  const ms = Date.now() - started;
  console.log(
    `smoke:muse: OK (model=${getMuseModel()} base=${getMuseBaseUrl()} ` +
      `type=${result.documentType} fields=${result.fields.length} ms=${ms})`
  );
}

main().catch((err: unknown) => {
  console.error("smoke:muse: FAILED", err instanceof Error ? err.message.slice(0, 300) : err);
  process.exit(1);
});
