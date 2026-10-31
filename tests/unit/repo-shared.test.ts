import { describe, expect, it } from "vitest";
import { MemoryRepository, DEMO_EMAIL } from "@/server/repo/memory";
import {
  _resetRepoForTests,
  _setRepoForTests,
  getRepo,
} from "@/server/repo/index";

describe("Shared in-memory store (Phase 0)", () => {
  it("globalThis repo is shared across getRepo() calls in demo mode", async () => {
    _resetRepoForTests();
    // Force demo mode (no MONGODB_URI in test env)
    const repo1 = getRepo();
    const repo2 = getRepo();
    expect(repo1).toBe(repo2);

    // Data written through one instance is visible through the other
    const user = await repo1.getUserByEmail(DEMO_EMAIL);
    expect(user).not.toBeNull();

    const docs1 = await repo1.listDocuments(user!.id);
    const docs2 = await repo2.listDocuments(user!.id);
    expect(docs2).toHaveLength(docs1.length);
  });

  it("_resetRepoForTests clears the shared demo repo", async () => {
    _resetRepoForTests();
    const repo = getRepo();
    const user = await repo.getUserByEmail(DEMO_EMAIL);
    expect(user).not.toBeNull();
  });
});
