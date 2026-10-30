import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const repo = getRepo();
  const doc = await repo.getDocument(user.id, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stored = await repo.getFile(user.id, doc.fileRef);
  if (!stored) return NextResponse.json({ error: "File not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(stored.bytes), {
    status: 200,
    headers: {
      "content-type": stored.mimeType,
      "content-length": String(stored.bytes.length),
      "content-disposition": `inline; filename="${encodeURIComponent(stored.fileName)}"`,
      "cache-control": "private, no-store",
    },
  });
}
