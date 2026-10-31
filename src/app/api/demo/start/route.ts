import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getRepo } from "@/server/repo/index";
import { seedDemoData } from "@/server/demo-seed";
import { rateLimitCheck } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stricter limit for demo account creation: 5 per hour per IP (userId is "demo").
const DEMO_LIMIT = 5;

export async function POST() {
  const repo = getRepo();
  const rateLimit = await rateLimitCheck("demo", "demo-start");
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
