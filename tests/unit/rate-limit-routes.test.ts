import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRepository } from "@/server/repo/memory";
import { _setRepoForTests } from "@/server/repo/index";
import { clientIp } from "@/server/rate-limit";
import { POST as demoStart } from "@/app/api/demo/start/route";
import { POST as register } from "@/app/api/auth/register/route";
import { verifyCredentials } from "@/server/auth";

// Route-level tests: call the real handlers, not just the counter.

function demoReq(ip: string) {
  return new Request("http://localhost/api/demo/start", {
    method: "POST",
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
  });
}

function signupReq(ip: string, email: string) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
}

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(clientIp(demoReq("203.0.113.7"))).toBe("203.0.113.7");
  });
  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "198.51.100.2" } }))).toBe("198.51.100.2");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});

describe("Demo start without a database (serverless in-memory mode)", () => {
  beforeEach(() => {
    _setRepoForTests(new MemoryRepository({ seed: true }));
  });

  it("hands out the built-in demo account, which logs in on any other instance", async () => {
    const res = await demoStart(demoReq("203.0.113.9"));
    expect(res.status).toBe(200);
    const creds = await res.json();
    expect(creds.shared).toBe(true);

    // Simulate the login landing on a different server with its own fresh memory.
    _setRepoForTests(new MemoryRepository({ seed: true }));
    const user = await verifyCredentials(creds.email, creds.password);
    expect(user).not.toBeNull();
  });

  it("never locks visitors out in this mode", async () => {
    let last = 0;
    for (let i = 0; i < 40; i++) last = (await demoStart(demoReq("192.0.2.10"))).status;
    expect(last).toBe(200);
  });
});

describe("Sign-up rate limit is per client IP, not per email", () => {
  beforeEach(() => {
    _setRepoForTests(new MemoryRepository({ seed: false }));
  });

  it("blocks many sign-ups from one IP even with different emails", async () => {
    const ip = "203.0.113.200";
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await register(signupReq(ip, `user${i}-${Date.now()}@example.com`))).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
