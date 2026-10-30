import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getRepo } from "@/server/repo/index";
import { seedDemoData } from "@/server/demo-seed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const repo = getRepo();
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
