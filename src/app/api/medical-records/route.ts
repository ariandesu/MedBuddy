import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const records = await getRepo().listMedicalRecords(user.id, {
    from: from || undefined,
    to: to || undefined,
  });
  return NextResponse.json({ records });
}
