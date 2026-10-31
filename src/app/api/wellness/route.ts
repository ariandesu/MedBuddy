import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { z } from "zod";

const wellnessSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sleepHours: z.number().min(0).max(24).optional().nullable(),
  waterGlasses: z.number().int().min(0).max(30).optional().nullable(),
  activityMinutes: z.number().int().min(0).max(1440).optional().nullable(),
  energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional().nullable(),
  symptomLevel: z.enum(["none", "mild", "moderate", "severe"]).optional().nullable(),
  symptoms: z.array(z.string()).optional(),
  note: z.string().max(500).optional().nullable(),
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

  // Use client-provided local date (YYYY-MM-DD), default to today.
  const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);
  // Reject dates more than 1 day in the future.
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (date > tomorrow) {
    return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
  }

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
