import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { readingInputSchema } from "@/lib/schemas";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const saveSchema = z.object({
  // The phone's local date. The server's clock isn't the person's.
  date: isoDate,
  readings: z.array(readingInputSchema).min(1).max(5),
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
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid reading" }, { status: 400 });

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (parsed.data.date > tomorrow) {
    return NextResponse.json({ error: "Date cannot be in the future" }, { status: 400 });
  }

  const repo = getRepo();
  const readings = await Promise.all(
    parsed.data.readings.map((r) => repo.upsertDeviceReading(user.id, parsed.data.date, r))
  );
  return NextResponse.json({ readings }, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = isoDate.safeParse(searchParams.get("from"));
  const to = isoDate.safeParse(searchParams.get("to"));
  if (!from.success || !to.success) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }
  const readings = await getRepo().listDeviceReadings(user.id, { from: from.data, to: to.data });
  return NextResponse.json({ readings });
}
