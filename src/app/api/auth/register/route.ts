import { z } from "zod";
import bcrypt from "bcryptjs";
import { getRepo } from "@/server/repo/index";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const repo = getRepo();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await repo.getUserByEmail(email);
  if (existing) {
    return Response.json({ error: "User already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await repo.createUser({ email, passwordHash, locale: "bn" });

  return Response.json({ ok: true }, { status: 201 });
}
