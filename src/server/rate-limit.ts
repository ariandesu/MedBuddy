/**
 * Simple per-user, per-route rate limiter.
 * Limit: 20 requests per hour per route per user.
 * Memory mode: in-memory Map.
 * Mongo mode: rate_limits collection with TTL index.
 */
import { getMongoUri } from "@/server/env";

const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function now(): number {
  return Date.now();
}

function keyFor(userId: string, route: string): string {
  return `${userId}:${route}`;
}

export async function rateLimitCheck(
  userId: string,
  route: string
): Promise<{ allowed: boolean; remaining: number }> {
  const uri = getMongoUri();

  if (uri) {
    // Mongo mode - use the repo's db.
    const { getRepo } = await import("@/server/repo/index");
    const repo = getRepo();
    const db = await (repo as unknown as { db: () => Promise<unknown> }).db();
    const dbo = db as unknown as {
      collection: (name: string) => {
        deleteMany: (filter: unknown) => Promise<unknown>;
        createIndex: (keys: unknown, options?: unknown) => Promise<unknown>;
        findOne: (filter: unknown) => Promise<{ count?: number } | null>;
        updateOne: (
          filter: unknown,
          update: unknown,
          options?: unknown
        ) => Promise<unknown>;
      };
    };
    const nowMs = now();
    const windowStart = nowMs - WINDOW_MS;
    const key = keyFor(userId, route);

    // Remove expired.
    await dbo
      .collection("rate_limits")
      .deleteMany({ expiresAt: { $lt: new Date(nowMs) } });

    // Ensure TTL index.
    await dbo
      .collection("rate_limits")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const existing = await dbo
      .collection("rate_limits")
      .findOne({ key });

    const count = existing ? (existing.count ?? 0) : 0;

    if (count >= LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    await dbo
      .collection("rate_limits")
      .updateOne(
        { key },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            expiresAt: new Date(nowMs + WINDOW_MS),
          },
        },
        { upsert: true }
      );

    return { allowed: true, remaining: LIMIT - count - 1 };
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

  if (count >= LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  memoryStore.set(key, {
    count: count + 1,
    resetAt: nowMs + WINDOW_MS,
  });

  return { allowed: true, remaining: LIMIT - count - 1 };
}
