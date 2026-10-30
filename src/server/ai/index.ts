import { getModelApiKey } from "@/server/env";
import { AIProvider } from "./types";
import { FixtureAI } from "./fixture";
import { MuseAI } from "./muse";

let cached: AIProvider | null = null;

/**
 * Lazy singleton. Decides mode at REQUEST time:
 * MODEL_API_KEY set → MuseAI, else FixtureAI (canned, isSample).
 */
export function getAI(): AIProvider {
  if (cached) return cached;
  cached = getModelApiKey() ? new MuseAI() : new FixtureAI();
  return cached;
}

export function _resetAIForTests(): void {
  cached = null;
}

export function _setAIForTests(provider: AIProvider | null): void {
  cached = provider;
}
