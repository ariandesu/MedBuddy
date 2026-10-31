import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getRepo } from "@/server/repo/index";
import { seedDemoData } from "@/server/demo-seed";
import { clientIp, rateLimitCheck } from "@/server/rate-limit";
import { isDemoDataMode } from "@/server/env";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/server/repo/memory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Demo account creation: 30 per hour per client IP (judges on shared venue Wi-Fi
// share one IP, so keep headroom). Keyed per IP so one
// visitor (or bot) can never lock the demo out for everyone else.
const DEMO_LIMIT = 30;

export async function POST(req: Request) {
  // No database (in-memory mode): on serverless hosts like Vercel each request
  // can land on a different instance with its own memory, so a freshly created
  // account is unknown to the instance that handles the login (→ 401). Every
  // instance seeds the same built-in demo account with fixed ids, so hand that
  // out instead. Nothing is created, so no rate limit is needed.
  if (isDemoDataMode()) {
    return Response.json(
      { email: DEMO_EMAIL, password: DEMO_PASSWORD, shared: true },
      { status: 200 }
    );
  }

  // With MongoDB: a private, freshly seeded demo account per visitor.
  const repo = getRepo();
  const rateLimit = await rateLimitCheck(`ip:${clientIp(req)}`, "demo-start", DEMO_LIMIT);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const email = `demo-${randomUUID().slice(0, 8)}@medisathi.app`;
  const password = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await repo.createUser({
    email,
    passwordHash,
    locale: "bn",
  });

  await seedDemoData(repo, user.id);

  return Response.json({ email, password }, { status: 201 });
}
