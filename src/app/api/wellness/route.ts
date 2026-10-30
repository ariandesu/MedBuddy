import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { z } from "zod";

const wellnessSchema = z.object({
  sleepHours: z.number().min(0).max(24).optional(),
  waterGlasses: z.number().int().min(0).max(30).optional(),
  activityMinutes: z.number().int().min(0).max(1440).optional(),
  energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  symptomLevel: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  symptoms: z.array(z.string()).optional(),
  note: z.string().max(500).optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = wellnessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid check-in" }, { status: 400 });
  }

  // date = today in local timezone (YYYY-MM-DD)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = today.toISOString().slice(0, 10);

  const entry = await getRepo().upsertWellnessEntry(user.id, date, parsed.data);
  return NextResponse.json(entry, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  const entries = await getRepo().listWellnessEntries(user.id, from, to);
  return NextResponse.json({ entries });
}
