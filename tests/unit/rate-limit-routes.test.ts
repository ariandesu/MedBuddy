import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRepository } from "@/server/repo/memory";
import { _setRepoForTests } from "@/server/repo/index";
import { clientIp } from "@/server/rate-limit";
import { POST as demoStart } from "@/app/api/demo/start/route";
import { POST as register } from "@/app/api/auth/register/route";

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

describe("Demo start rate limit is per client IP", () => {
  beforeEach(() => {
    _setRepoForTests(new MemoryRepository({ seed: false }));
  });

  it("one IP hitting the limit does not lock out other visitors", async () => {
    const ipA = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    let lastA = 0;
    for (let i = 0; i < 31; i++) lastA = (await demoStart(demoReq(ipA))).status;
    expect(lastA).toBe(429); // the 31st request from the same IP is refused

    const other = await demoStart(demoReq("198.51.100.77"));
    expect(other.status).toBe(201); // a different visitor still gets a demo
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
