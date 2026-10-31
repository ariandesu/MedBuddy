import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getRepo } from "@/server/repo/index";
import { seedDemoData } from "@/server/demo-seed";
import { clientIp, rateLimitCheck } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Demo account creation: 30 per hour per client IP (judges on shared venue Wi-Fi
// share one IP, so keep headroom). Keyed per IP so one
// visitor (or bot) can never lock the demo out for everyone else.
const DEMO_LIMIT = 30;

export async function POST(req: Request) {
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
