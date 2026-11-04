import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getAI } from "@/server/ai/index";
import { getLocaleAndDict } from "@/lib/i18n/server";
import type { Dictionary, Locale } from "@/lib/i18n";
import { formatDate } from "@/lib/digits";
import { URGENT_SYMPTOMS } from "@/lib/safety/redflags";
import { groundSummaryChanges, stripRecordIds } from "@/server/ai/grounding";
import { isDemoAiMode, getMuseModel } from "@/server/env";
import { aiRateLimitCheck } from "@/server/rate-limit";
import { todayISODate } from "@/server/dates";
import { buildWellnessDigest, type WellnessDigest } from "@/server/trends";
import type { HealthSummaryPayload } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHECKIN_WINDOW_DAYS = 30;

function urgentQuestion(wellness: WellnessDigest | null, dict: Dictionary, locale: Locale): string[] {
  const urgent = wellness?.symptomDays.filter((d) => d.urgent) ?? [];
  if (urgent.length === 0) return [];
  const label = (value: string) => {
    const known = URGENT_SYMPTOMS.find((s) => s.value === value);
    return known ? dict.checkin[known.key] : value;
  };
  const noted = new Set(urgent.flatMap((d) => d.symptoms.map(label)));
  if (urgent.some((d) => d.symptomLevel === "severe")) noted.add(dict.checkin.symptomSevere);
  return [
    dict.summary.urgentQuestion
      .replace("{{dates}}", urgent.map((d) => formatDate(d.date, locale)).join(", "))
      .replace("{{symptoms}}", [...noted].join(", ")),
  ];
}

export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await aiRateLimitCheck(user, "summaries", req);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { locale, dict } = await getLocaleAndDict();
  const repo = getRepo();
  const records = await repo.listMedicalRecords(user.id);
  if (records.length === 0) {
    return NextResponse.json(
      { error: "No confirmed records to summarise" },
      { status: 400 }
    );
  }

  // Check-ins from the same 30-day window the timeline shows. Trends are computed here.
  const to = todayISODate();
  const from = new Date(Date.parse(`${to}T00:00:00Z`) - (CHECKIN_WINDOW_DAYS - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const checkins = await repo.listWellnessEntries(user.id, from, to);
  const wellness = buildWellnessDigest(checkins, from, to);

  const dates = [
    ...records.map((r) => r.recordDate).filter((d): d is string => d != null),
    ...checkins.map((c) => c.date),
  ].sort();
  const coveredFrom = dates[0] ?? "";
  const coveredTo = dates[dates.length - 1] ?? "";

  let payload: HealthSummaryPayload;
  try {
    payload = await getAI().generateSummary(records, coveredFrom, coveredTo, locale, wellness);
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
      summary: stripRecordIds(payload.summary),
      observedChanges: changes.map((c) => ({
        ...c,
        description: stripRecordIds(c.description),
      })),
      missingInformation: payload.missingInformation,
      // Added in code so an urgent check-in reaches the doctor whatever the model wrote.
      questionsForDoctor: [
        ...urgentQuestion(wellness, dict, locale),
        ...payload.questionsForDoctor,
      ],
      limitations,
    },
    sourceRecordIds: records.map((r) => r.id),
    model: isDemoAiMode() ? "fixture" : getMuseModel(),
    isSample: isDemoAiMode(),
  });

  return NextResponse.json(summary, { status: 201 });
}
