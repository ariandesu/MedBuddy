import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getAI } from "@/server/ai/index";
import { getLocale } from "@/lib/i18n/server";
import { groundSummaryChanges } from "@/server/ai/grounding";
import type { HealthSummaryPayload } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locale = await getLocale();
  const repo = getRepo();
  const records = await repo.listMedicalRecords(user.id);
  if (records.length === 0) {
    return NextResponse.json(
      { error: "No confirmed records to summarise" },
      { status: 400 }
    );
  }

  const dates = records
    .map((r) => r.recordDate)
    .filter((d): d is string => d != null);
  const coveredFrom = dates.length ? dates.sort()[0] : "";
  const coveredTo = dates.length ? dates.sort().pop()! : "";

  let payload: HealthSummaryPayload;
  try {
    payload = await getAI().generateSummary(records, coveredFrom, coveredTo, locale);
  } catch {
    return NextResponse.json({ error: "Summary generation failed" }, { status: 502 });
  }

  const allowed = new Set(records.map((r) => r.id));
  const { changes, limitationNote } = groundSummaryChanges(
    payload.observedChanges,
    allowed
  );
  const limitations = [...payload.limitations];
  if (limitationNote) limitations.push(limitationNote);

  const summary = await repo.createHealthSummary({
    userId: user.id,
    coveredFrom,
    coveredTo,
    payload: {
      summary: payload.summary,
      observedChanges: changes,
      missingInformation: payload.missingInformation,
      questionsForDoctor: payload.questionsForDoctor,
      limitations,
    },
    sourceRecordIds: records.map((r) => r.id),
    model: "fixture",
    isSample: true,
  });

  return NextResponse.json(summary, { status: 201 });
}
