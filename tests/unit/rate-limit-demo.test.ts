import { describe, expect, it } from "vitest";
import { rateLimitCheck } from "@/server/rate-limit";

describe("Rate limit: demo start (Phase 0)", () => {
  it("allows requests under the limit", async () => {
    // Reset the memory store by using unique user IDs
    const result1 = await rateLimitCheck("demo-user-1", "demo-start");
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBeGreaterThanOrEqual(0);
  });

  it("tracks count per user", async () => {
    const r1 = await rateLimitCheck("demo-user-2", "demo-start");
    const r2 = await rateLimitCheck("demo-user-2", "demo-start");
    expect(r2.remaining).toBe(r1.remaining - 1);
  });

  it("different routes have independent limits", async () => {
    // Use demo-start twice, signup once - they should not share counters
    await rateLimitCheck("demo-user-3", "demo-start");
    await rateLimitCheck("demo-user-3", "demo-start");
    const r1 = await rateLimitCheck("demo-user-3", "demo-start");
    const r2 = await rateLimitCheck("demo-user-3", "signup");
    // demo-start has been called 3 times → remaining 17
    // signup has been called 1 time → remaining 19
    expect(r1.remaining).toBe(17);
    expect(r2.remaining).toBe(19);
  });
});
