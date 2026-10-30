import { getMongoUri, getMongoDb } from "@/server/env";
import type { Repository } from "./types";
import { MemoryRepository } from "./memory";
import { MongoRepository } from "./mongo";

let cached: Repository | null = null;

/**
 * Lazy singleton. Decides mode at REQUEST time (never at import/build):
 * MONGODB_URI set → MongoRepository, else seeded MemoryRepository.
 */
export function getRepo(): Repository {
  if (cached) return cached;
  const uri = getMongoUri();
  cached = uri
    ? new MongoRepository(uri, getMongoDb())
    : new MemoryRepository({ seed: true });
  return cached;
}

/** Test-only helpers. */
export function _resetRepoForTests(): void {
  cached = null;
}

export function _setRepoForTests(repo: Repository | null): void {
  cached = repo;
}
