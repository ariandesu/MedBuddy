import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getAI } from "@/server/ai/index";
import { getLocale } from "@/lib/i18n/server";
import { rateLimitCheck } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const rateLimit = await rateLimitCheck(user.id, "explain");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const repo = getRepo();
  const record = await repo.getMedicalRecord(user.id, id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const locale = await getLocale();
  const explanation = await getAI().explainRecord(record, locale);

  return NextResponse.json(explanation);
}
