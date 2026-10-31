import { describe, expect, it, vi, beforeEach } from "vitest";

// Pretend a database is configured, while the rate limiter and repo stay in memory.
vi.mock("@/server/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/env")>();
  return { ...actual, isDemoDataMode: () => false };
});

import { MemoryRepository } from "@/server/repo/memory";
import { _setRepoForTests } from "@/server/repo/index";
import { POST as demoStart } from "@/app/api/demo/start/route";

function demoReq(ip: string) {
  return new Request("http://localhost/api/demo/start", {
    method: "POST",
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  });
}

describe("Demo start with a database: private accounts, rate-limited per IP", () => {
  beforeEach(() => {
    _setRepoForTests(new MemoryRepository({ seed: false }));
  });

  it("creates a private account per visitor", async () => {
    const res = await demoStart(demoReq("198.51.100.5"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toMatch(/^demo-.+@medisathi\.app$/);
    expect(body.shared).toBeUndefined();
  });

  it("one IP hitting the limit does not lock out other visitors", async () => {
    let lastA = 0;
    for (let i = 0; i < 31; i++) lastA = (await demoStart(demoReq("192.0.2.77"))).status;
    expect(lastA).toBe(429);
    expect((await demoStart(demoReq("198.51.100.78"))).status).toBe(201);
  });
});
