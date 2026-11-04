import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { MemoryRepository } from "@/server/repo/memory";
import { _setRepoForTests } from "@/server/repo/index";
import { _setAIForTests } from "@/server/ai/index";
import { aiRateLimitCheck } from "@/server/rate-limit";
import { getMongoDb } from "@/server/env";
import { DEMO_EMAIL, DEMO_RETENTION_MS, isDemoAccountEmail } from "@/lib/demo";
import type { AIProvider } from "@/server/ai/types";

let sessionUser = { id: "route-user", email: "someone@example.test" };
vi.mock("next-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth")>();
  return {
    ...actual,
    getServerSession: async () => ({ user: sessionUser }),
  };
});
vi.mock("@/lib/i18n/server", () => ({
  getLocale: async () => "en",
  getLocaleAndDict: async () => {
    const { getDictionary } = await import("@/lib/i18n");
    return { locale: "en", dict: getDictionary("en") };
  },
}));

import { authOptions, loginAllowed, verifyCredentials } from "@/server/auth";
import { POST as retry } from "@/app/api/documents/[id]/retry/route";
import { POST as register } from "@/app/api/auth/register/route";

const reqFrom = (ip: string) => ({ headers: new Headers({ "x-forwarded-for": ip }) });
const demoUser = (n: number) => ({ id: `demo-id-${n}`, email: `demo-${String(n).padStart(8, "0")}@medisathi.app` });

describe("demo account addresses", () => {
  it("matches only what /api/demo/start generates", () => {
    expect(isDemoAccountEmail("demo-1a2b3c4d@medisathi.app")).toBe(true);
    expect(isDemoAccountEmail(DEMO_EMAIL)).toBe(false);
    expect(isDemoAccountEmail("demo-1a2b3c4d@gmail.com")).toBe(false);
    expect(isDemoAccountEmail("demo-nothex!@medisathi.app")).toBe(false);
    expect(isDemoAccountEmail(null)).toBe(false);
  });
});

describe("AI usage caps", () => {
  it("new accounts don't reset the per-IP allowance", async () => {
    const results = [];
    for (let i = 0; i < 101; i++) {
      results.push(await aiRateLimitCheck({ id: `ip-cap-${i}`, email: "x@example.test" }, "ask", reqFrom("203.0.113.50")));
    }
    expect(results.slice(0, 100).every((r) => r.allowed)).toBe(true);
    expect(results[100].allowed).toBe(false);
    // Someone else on another IP is unaffected.
    expect((await aiRateLimitCheck({ id: "ip-cap-other", email: "x@example.test" }, "ask", reqFrom("203.0.113.51"))).allowed).toBe(true);
  });

  it("each account keeps its own per-route limit", async () => {
    const user = { id: "route-cap", email: "x@example.test" };
    for (let i = 0; i < 20; i++) {
      expect((await aiRateLimitCheck(user, "ask", reqFrom(`198.51.100.${i}`))).allowed).toBe(true);
    }
    expect((await aiRateLimitCheck(user, "ask", reqFrom("198.51.100.200"))).allowed).toBe(false);
  });

  it("all demo accounts share one budget across IPs, and real users aren't in it", async () => {
    const ip = (i: number) => reqFrom(`10.${Math.floor(i / 250)}.${i % 250}.1`);
    for (let i = 0; i < 500; i++) {
      expect((await aiRateLimitCheck(demoUser(i), "ask", ip(i))).allowed).toBe(true);
    }
    expect((await aiRateLimitCheck(demoUser(500), "ask", ip(500))).allowed).toBe(false);
    expect((await aiRateLimitCheck({ id: "real", email: "real@example.test" }, "ask", ip(501))).allowed).toBe(true);
  });

  it("the retry route is limited too", async () => {
    const repo = new MemoryRepository({ seed: false, userId: "route-user" });
    _setRepoForTests(repo);
    const extractDocument = vi.fn(async () => ({
      documentType: "other" as const,
      documentDateRaw: null,
      documentDate: null,
      fields: [],
      ocrText: "",
    }));
    _setAIForTests({ extractDocument } as unknown as AIProvider);
    await repo.storeFile("route-user", "r", Buffer.from("x"), "image/jpeg", "a.jpg");
    const doc = await repo.createDocument({
      userId: "route-user",
      fileName: "a.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1,
      checksum: "c",
      fileRef: "r",
    });
    sessionUser = { id: "route-user", email: "someone@example.test" };
    const call = () =>
      retry(
        new NextRequest("http://localhost/x", { method: "POST", headers: { "x-forwarded-for": "192.0.2.77" } }),
        { params: Promise.resolve({ id: doc.id }) }
      );
    for (let i = 0; i < 20; i++) expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(429);
    expect(extractDocument).toHaveBeenCalledTimes(20);
  });
});

describe("login limits", () => {
  const authorize = (authOptions.providers[0] as unknown as {
    options: { authorize: (c: { email: string; password: string }, r: unknown) => Promise<unknown> };
  }).options.authorize;

  beforeEach(async () => {
    const repo = new MemoryRepository({ seed: false });
    await repo.createUser({
      email: "victim@example.test",
      passwordHash: await bcrypt.hash("correct-password", 4),
      locale: "en",
    });
    _setRepoForTests(repo);
  });

  it("stops password guessing on one account from many IPs, even with the right password", async () => {
    for (let i = 0; i < 30; i++) {
      expect(await loginAllowed("Victim@Example.test", `198.18.0.${i}`)).toBe(true);
    }
    const out = await authorize(
      { email: "victim@example.test", password: "correct-password" },
      { headers: { "x-forwarded-for": "198.18.1.1" } }
    );
    expect(out).toBeNull();
  });

  it("stops one IP guessing across many accounts", async () => {
    const results = [];
    for (let i = 0; i < 101; i++) results.push(await loginAllowed(`u${i}@example.test`, "198.18.2.2"));
    expect(results[99]).toBe(true);
    expect(results[100]).toBe(false);
  });

  it("a normal login still works", async () => {
    const repo = new MemoryRepository({ seed: false });
    await repo.createUser({
      email: "fine@example.test",
      passwordHash: await bcrypt.hash("correct-password", 4),
      locale: "en",
    });
    _setRepoForTests(repo);
    const out = await authorize(
      { email: "fine@example.test", password: "correct-password" },
      { headers: { "x-forwarded-for": "198.18.3.3" } }
    );
    expect(out).toMatchObject({ email: "fine@example.test" });
  });

  it("the shared no-database demo login has no per-email limit", async () => {
    for (let i = 0; i < 40; i++) {
      expect(await loginAllowed(DEMO_EMAIL, `198.18.4.${i}`)).toBe(true);
    }
  });

  it("an unknown email does the same hashing work as a real one", async () => {
    const hash = vi.spyOn(bcrypt, "hash");
    expect(await verifyCredentials("nobody@example.test", "whatever-password")).toBeNull();
    expect(hash).toHaveBeenCalledTimes(1);
    hash.mockRestore();
  });
});

describe("sign-up", () => {
  const post = (body: string, ip: string) =>
    register(new Request("http://localhost/x", { method: "POST", headers: { "x-forwarded-for": ip }, body }));

  beforeEach(() => _setRepoForTests(new MemoryRepository({ seed: false })));

  it("malformed JSON is a 400, not a crash", async () => {
    expect((await post("not-json", "192.0.2.10")).status).toBe(400);
  });

  it("can't take a demo-style address that would be auto-deleted", async () => {
    const body = JSON.stringify({ email: "demo-1a2b3c4d@medisathi.app", password: "password123" });
    expect((await post(body, "192.0.2.11")).status).toBe(400);
    const upper = JSON.stringify({ email: "Someone@MEDISATHI.app", password: "password123" });
    expect((await post(upper, "192.0.2.11")).status).toBe(400);
  });

  it("other addresses still register", async () => {
    const body = JSON.stringify({ email: "new@example.test", password: "password123" });
    expect((await post(body, "192.0.2.12")).status).toBe(201);
  });
});

describe("demo session expiry", () => {
  const callbacks = authOptions.callbacks as unknown as {
    jwt: (a: { token: Record<string, unknown>; user?: unknown }) => Promise<Record<string, unknown>>;
    session: (a: { session: { user: Record<string, unknown> }; token: Record<string, unknown> }) => Promise<{ user: Record<string, unknown> }>;
  };
  const session = (token: Record<string, unknown>) =>
    callbacks.session({ session: { user: { email: "x" } }, token });

  it("stamps demo accounts only", async () => {
    const demo = await callbacks.jwt({ token: {}, user: { id: "1", email: "demo-1a2b3c4d@medisathi.app" } });
    expect(demo.demoExpiresAt).toBeGreaterThan(Date.now() + DEMO_RETENTION_MS - 5000);
    const real = await callbacks.jwt({ token: {}, user: { id: "2", email: "real@example.test" } });
    expect(real.demoExpiresAt).toBeUndefined();
  });

  it("drops the user id once expired", async () => {
    expect((await session({ id: "1", demoExpiresAt: Date.now() + 1000 })).user.id).toBe("1");
    expect((await session({ id: "1", demoExpiresAt: Date.now() - 1000 })).user.id).toBeUndefined();
    expect((await session({ id: "2" })).user.id).toBe("2");
  });
});

describe("preview deployments", () => {
  afterEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.MONGODB_DB;
  });

  it("use their own database, never production's", () => {
    process.env.MONGODB_DB = "medisathi";
    process.env.VERCEL_ENV = "preview";
    expect(getMongoDb()).toBe("medisathi_preview");
    process.env.MONGODB_DB = "other_preview";
    expect(getMongoDb()).toBe("other_preview");
    delete process.env.MONGODB_DB;
    expect(getMongoDb()).toBe("medisathi_preview");
  });

  it("production and local are unchanged", () => {
    process.env.MONGODB_DB = "medisathi";
    process.env.VERCEL_ENV = "production";
    expect(getMongoDb()).toBe("medisathi");
    delete process.env.VERCEL_ENV;
    expect(getMongoDb()).toBe("medisathi");
  });
});
