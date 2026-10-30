import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getAI } from "@/server/ai/index";
import { getLocale } from "@/lib/i18n/server";
import { retrieveRecords, buildContext, groundCitations } from "@/server/ai/grounding";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locale = await getLocale();
  const repo = getRepo();

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const records = await repo.listMedicalRecords(user.id);
  const latest = await repo.getLatestHealthSummary(user.id);

  const hits = retrieveRecords(question, records, 10);
  if (hits.length === 0 && !latest) {
    return NextResponse.json({
      answer: "I couldn't find this in your records.",
      citations: [],
      limitations: ["No matching records or summary found."],
    });
  }

  const context = buildContext(hits, latest);

  let answerText: string;
  let citations: string[];
  let limitations: string[];
  try {
    const ai = await getAI().answerQuestion(question, context, locale);
    const allowed = new Set([...hits.map((r) => r.id), ...(latest ? [latest.id] : [])]);
    answerText = ai.answer;
    citations = groundCitations(ai.citations, allowed);
    limitations = ai.limitations;
  } catch {
    answerText = "I couldn't find this in your records.";
    citations = [];
    limitations = ["Model unavailable; no grounded answer."];
  }

  if (citations.length === 0 && hits.length === 0 && !latest) {
    answerText = "I couldn't find this in your records.";
  }

  return NextResponse.json({ answer: answerText, citations, limitations });
}
