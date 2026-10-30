import { describe, expect, it } from "vitest";
import { verifyCredentials } from "@/server/auth";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

// Uses the seeded MemoryRepository singleton (vitest.setup deletes MONGODB_URI).
describe("credentials (M3)", () => {
  it("accepts the demo user", async () => {
    const user = await verifyCredentials(DEMO_EMAIL, DEMO_PASSWORD);
    expect(user).not.toBeNull();
    expect(user!.email).toBe(DEMO_EMAIL);
  });

  it("rejects wrong password", async () => {
    expect(await verifyCredentials(DEMO_EMAIL, "wrong-password")).toBeNull();
  });

  it("rejects unknown email", async () => {
    expect(
      await verifyCredentials("nobody@example.com", "whatever123")
    ).toBeNull();
  });

  it("rejects invalid input without throwing", async () => {
    expect(await verifyCredentials("not-an-email", "x")).toBeNull();
    expect(await verifyCredentials(DEMO_EMAIL, "")).toBeNull();
    expect(await verifyCredentials("", "")).toBeNull();
  });
});
