import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { z } from "zod";
import type { ExtractedField } from "@/lib/schemas/extraction";

const fieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  rawValue: z.string(),
  numericValue: z.number().nullable(),
  unit: z.string().nullable(),
  referenceRangeRaw: z.string().nullable(),
  page: z.number(),
  sources: z.object({ muse: z.string().nullable(), ocr: z.string().nullable() }),
  agreement: z.enum(["match", "mismatch", "single_source"]),
  confidence: z.number().nullable(),
  needsReview: z.boolean(),
  userEdited: z.boolean(),
});

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: { fields: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const fields = z.array(fieldSchema).safeParse(body.fields);
  if (!fields.success) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }

  const repo = getRepo();
  const updated = await repo.updateExtractionFields(
    user.id,
    id,
    fields.data as ExtractedField[]
  );
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: updated.id, fields: updated.fields });
}

export async function POST(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
