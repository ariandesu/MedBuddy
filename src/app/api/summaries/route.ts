import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const summary = await getRepo().getLatestHealthSummary(user.id);
  return NextResponse.json({ summary });
}
