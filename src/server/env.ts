import { z } from "zod";

/**
 * Lazy, runtime-only env access.
 * NEVER read process.env at module top level.
 * NEVER throw during `next build` — all getters return undefined on missing/invalid.
 */

const nonEmptyOptional = z.string().min(1).optional();

const mongoUriSchema = nonEmptyOptional;
const modelKeySchema = nonEmptyOptional;
const authSecretSchema = nonEmptyOptional;

function safeGet(
  key: "MONGODB_URI" | "MODEL_API_KEY" | "AUTH_SECRET",
  schema: typeof nonEmptyOptional
): string | undefined {
  try {
    const raw = process.env[key];
    if (!raw) return undefined;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return undefined;
    return parsed.data;
  } catch {
    return undefined;
  }
}

export function getMongoUri(): string | undefined {
  return safeGet("MONGODB_URI", mongoUriSchema);
}

export function getModelApiKey(): string | undefined {
  return safeGet("MODEL_API_KEY", modelKeySchema);
}

export function getAuthSecret(): string | undefined {
  return safeGet("AUTH_SECRET", authSecretSchema);
}

export function getMongoDb(): string {
  try {
    const raw = process.env.MONGODB_DB;
    if (!raw || raw.trim().length === 0) return "medisathi";
    return raw.trim();
  } catch {
    return "medisathi";
  }
}

export function getMuseModel(): string {
  try {
    const raw = process.env.MUSE_MODEL;
    if (!raw || raw.trim().length === 0) return "muse-spark-1.3";
    return raw.trim();
  } catch {
    return "muse-spark-1.3";
  }
}

export function getMuseBaseUrl(): string {
  try {
    const raw = process.env.MUSE_BASE_URL;
    if (!raw || raw.trim().length === 0) return "https://api.meta.ai/v1";
    return raw.trim().replace(/\/$/, "");
  } catch {
    return "https://api.meta.ai/v1";
  }
}

/** True when no MONGODB_URI — use MemoryRepository + seed fixtures. */
export function isDemoDataMode(): boolean {
  return !getMongoUri();
}

/** True when no MODEL_API_KEY — use FixtureAI. */
export function isDemoAiMode(): boolean {
  return !getModelApiKey();
}
