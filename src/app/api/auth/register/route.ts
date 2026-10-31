import { z } from "zod";
import bcrypt from "bcryptjs";
import { getRepo } from "@/server/repo/index";
import { clientIp, rateLimitCheck } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

// Sign-up: 10 per hour per client IP (per-email limits are trivially bypassed).
const SIGNUP_LIMIT = 10;

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const rateLimit = await rateLimitCheck(`ip:${clientIp(req)}`, "signup", SIGNUP_LIMIT);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const repo = getRepo();
  const email = parsed.data.email.toLowerCase();
  const existing = await repo.getUserByEmail(email);
  if (existing) {
    return Response.json({ error: "User already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await repo.createUser({ email, passwordHash, locale: "bn" });

  return Response.json({ ok: true }, { status: 201 });
}
