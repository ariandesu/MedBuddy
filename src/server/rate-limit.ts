/**
 * Simple per-key, per-route rate limiter (key = user id or client IP).
 * Default limit: 20 requests per hour per route per key.
 * Memory mode: in-memory Map.
 * Mongo mode: rate_limits collection with TTL index.
 */
import { getMongoUri } from "@/server/env";
import { isDemoAccountEmail } from "@/lib/demo";

const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Paid Muse calls, per hour. A new demo account gets a fresh per-account limit,
// so these caps are what actually bound the cost. Venue Wi-Fi shares one IP.
const AI_PER_IP = 100;
const AI_ALL_DEMO_ACCOUNTS = 500;

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function now(): number {
  return Date.now();
}

function keyFor(userId: string, route: string): string {
  return `${userId}:${route}`;
}

/**
 * Best-effort client IP for unauthenticated routes (demo start, sign-up).
 * On Vercel the first x-forwarded-for entry is the real client.
 */
export function clientIp(req: Pick<Request, "headers">): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Gate for every route that can call the model. */
export async function aiRateLimitCheck(
  user: { id: string; email: string },
  route: string,
  req: Pick<Request, "headers">
): Promise<{ allowed: boolean }> {
  const checks = await Promise.all([
    rateLimitCheck(user.id, route),
    rateLimitCheck(`ip:${clientIp(req)}`, "ai", AI_PER_IP),
    ...(isDemoAccountEmail(user.email)
      ? [rateLimitCheck("all-demo-accounts", "ai", AI_ALL_DEMO_ACCOUNTS)]
      : []),
  ]);
  return { allowed: checks.every((c) => c.allowed) };
}

export async function rateLimitCheck(
  userId: string,
  route: string,
  limit: number = LIMIT
): Promise<{ allowed: boolean; remaining: number }> {
  const LIMIT_FOR_CALL = limit;
  const uri = getMongoUri();

  if (uri) {
    // Mongo mode - use the repo's db.
    // Single atomic round-trip (findOneAndUpdate + upsert). The TTL index
    // auto-expires old keys, so no per-call cleanup is needed. Index creation
    // lives in ensureIndexes (once per instance, in the background).
    const { getRepo } = await import("@/server/repo/index");
    const repo = getRepo();
    const db = await (repo as unknown as { db: () => Promise<unknown> }).db();
    const dbo = db as unknown as {
      collection: (name: string) => {
        findOneAndUpdate: (
          filter: unknown,
          update: unknown,
          options?: unknown
        ) => Promise<{ count?: number } | null>;
      };
    };
    const nowMs = now();
    const key = keyFor(userId, route);

    const updated = await dbo.collection("rate_limits").findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          expiresAt: new Date(nowMs + WINDOW_MS),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    const count = updated?.count ?? 1;
    if (count > LIMIT_FOR_CALL) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: LIMIT_FOR_CALL - count };
  }

  // Memory mode.
  const key = keyFor(userId, route);
  const entry = memoryStore.get(key);
  const nowMs = now();

  if (entry && nowMs > entry.resetAt) {
    memoryStore.delete(key);
  }

  const current = memoryStore.get(key);
  const count = current ? current.count : 0;

  if (count >= LIMIT_FOR_CALL) {
    return { allowed: false, remaining: 0 };
  }

  memoryStore.set(key, {
    count: count + 1,
    resetAt: nowMs + WINDOW_MS,
  });

  return { allowed: true, remaining: LIMIT_FOR_CALL - count - 1 };
}
