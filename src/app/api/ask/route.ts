import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getAI } from "@/server/ai/index";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { wrapDocument } from "@/server/ai/prompts";
import { retrieveRecords, buildContext, groundCitations } from "@/server/ai/grounding";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { locale, dict } = await getLocaleAndDict();
  const repo = getRepo();

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: dict.ask.invalidBody }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: dict.ask.questionRequired }, { status: 400 });
  }

  const records = await repo.listMedicalRecords(user.id);
  const latest = await repo.getLatestHealthSummary(user.id);

  let hits = retrieveRecords(question, records, 10);
  // Fall back to 10 most recent records when keyword matching finds nothing
  // (e.g. Bangla question vs English lab names).
  if (hits.length === 0) {
    hits = records.slice(-10);
  }

  const context = buildContext(hits, latest);

  let answerText: string;
  let citations: string[];
  let limitations: string[];
  try {
    const ai = await getAI().answerQuestion(
      wrapDocument("question", question),
      context,
      locale
    );
    const allowed = new Set([...hits.map((r) => r.id), ...(latest ? [latest.id] : [])]);
    answerText = ai.answer;
    citations = groundCitations(ai.citations, allowed);
    limitations = ai.limitations;
  } catch {
    answerText = dict.ask.notFound;
    citations = [];
    limitations = [dict.ask.modelUnavailable];
  }

  if (citations.length === 0 && hits.length === 0 && !latest) {
    answerText = dict.ask.notFound;
  }

  return NextResponse.json({ answer: answerText, citations, limitations });
}
