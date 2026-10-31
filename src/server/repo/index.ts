import { getMongoUri, getMongoDb } from "@/server/env";
import type { Repository } from "./types";
import { MemoryRepository } from "./memory";
import { MongoRepository } from "./mongo";

let cached: Repository | null = null;

/**
 * Lazy singleton. Decides mode at REQUEST time (never at import/build):
 * MONGODB_URI set → MongoRepository, else seeded MemoryRepository.
 *
 * In Memory (demo) mode we keep the repo on globalThis so it survives
 * across Next.js dev server reloads and is shared across requests/pages.
 * Without this, each page load in dev gets a fresh in-memory store and
 * data appears to vanish between navigations.
 */

interface GlobalWithDemoRepo {
  __MEDISATHI_DEMO_REPO__?: Repository;
}

const globalWithDemoRepo = globalThis as GlobalWithDemoRepo;

function getDemoRepo(): Repository {
  const key = "__MEDISATHI_DEMO_REPO__";
  let repo = globalWithDemoRepo[key];
  if (!repo) {
    repo = new MemoryRepository({ seed: true });
    globalWithDemoRepo[key] = repo;
  }
  return repo;
}

export function getRepo(): Repository {
  if (cached) return cached;
  const uri = getMongoUri();
  if (uri) {
    cached = new MongoRepository(uri, getMongoDb());
    return cached;
  }
  return getDemoRepo();
}

/** Test-only helpers. */
export function _resetRepoForTests(): void {
  cached = null;
  delete globalWithDemoRepo.__MEDISATHI_DEMO_REPO__;
}

export function _setRepoForTests(repo: Repository | null): void {
  cached = repo;
  if (repo) {
    globalWithDemoRepo.__MEDISATHI_DEMO_REPO__ = repo;
  } else {
    delete globalWithDemoRepo.__MEDISATHI_DEMO_REPO__;
  }
}
