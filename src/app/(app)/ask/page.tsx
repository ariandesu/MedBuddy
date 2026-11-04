"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Mic, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocale } from "@/components/locale-provider";
import { recordTitle } from "@/lib/record-title";
import { PageTitle } from "@/components/page-title";
import { Orb } from "@/components/orb";
import { Tile } from "@/components/tile";
import { ReadAloud } from "@/components/read-aloud";
import { cn } from "@/lib/utils";

type SpeechRecognitionLike = {
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechWindow = {
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  SpeechRecognition?: new () => SpeechRecognitionLike;
};

type SavedRecord = { id: string; documentId: string; recordType: string; recordDate: string | null };

type Answer = {
  question: string;
  text: string;
  citations: { id: string; label: string }[];
  limitations: string[];
};

export function AskPage() {
  const { dict, locale } = useLocale();
  const t = dict.ask;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  async function ask(text: string) {
    if (!text.trim()) return;
    setError(null);
    setAnswer(null);
    setSaving(true);
    try {
      const [res, recRes] = await Promise.all([
        fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        }),
        // Sources open their paper, so citations need each record's document.
        fetch("/api/medical-records").catch(() => null),
      ]);
      if (!res.ok) throw new Error(dict.common.error);
      const data = await res.json();
      const recData = recRes?.ok ? await recRes.json() : {};
      setRecords(recData.records ?? []);
      setAnswer({
        question: text,
        text: data.answer ?? t.notFound,
        citations: Array.isArray(data.citations) ? data.citations : [],
        limitations: Array.isArray(data.limitations) ? data.limitations : [],
      });
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  function listen() {
    const w = window as unknown as SpeechWindow;
    const SR = w.webkitSpeechRecognition ?? w.SpeechRecognition;
    if (!SR) {
      setError(t.voiceNotSupported);
      return;
    }
    try {
      const rec = new SR();
      rec.lang = (document.documentElement.lang || "bn").startsWith("bn") ? "bn-BD" : "en-US";
      setListening(true);
      rec.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript ?? "";
        if (text) setQuestion(text);
      };
      rec.onerror = () => {};
      rec.onend = () => setListening(false);
      rec.start();
    } catch {
      setListening(false);
    }
  }

  const waiting = !answer && !saving;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageTitle title={t.title} subtitle={t.introShort} className={cn(waiting && "text-center")} />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(waiting || saving) && (
        <div className="orb-halo flex flex-col items-center gap-3 py-3 md:py-8">
          <Orb className="size-24 md:size-36" />
          {saving && <p role="status" className="font-medium">{t.looking}</p>}
        </div>
      )}

      {answer && (
        <>
          <p className="max-w-[85%] self-end rounded-[1.375rem] rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
            {answer.question}
          </p>
          <section aria-labelledby="answer-h" className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="answer-h" className="font-heading text-lg font-semibold">{t.fromRecords}</h2>
              <ReadAloud text={answer.text} label={t.speakAnswer} />
            </div>
            <p>{answer.text}</p>
            {answer.text === t.notFound && (
              <Link href="/records?add=1" className={cn(buttonVariants({ variant: "secondary" }), "h-12 w-full text-base font-semibold")}>
                {dict.documents.addPaper}
              </Link>
            )}
          </section>

          {answer.citations.length > 0 && (
            <section aria-labelledby="sources-h">
              <h2 id="sources-h" className="mb-2 font-heading text-lg font-semibold">{t.sources}</h2>
              <ul className="divide-y rounded-2xl border bg-card px-4">
                {answer.citations.map((c) => {
                  const rec = records.find((r) => r.id === c.id);
                  return (
                    <li key={c.id}>
                      <Link
                        href={rec ? `/documents/${rec.documentId}` : "/show-doctor?tab=summary"}
                        className="flex min-h-[4.25rem] items-center gap-3 py-2"
                      >
                        <Tile><FileText className="size-5" /></Tile>
                        <span className="min-w-0 flex-1 font-medium">
                          {rec ? recordTitle(rec, dict, locale) : c.label}
                        </span>
                        <ChevronRight className="size-5 shrink-0" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {answer.limitations.length > 0 && (
            <ul aria-label={t.limitations} className="flex flex-col gap-1 text-sm text-muted-foreground">
              {answer.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </>
      )}

      {waiting && (
        <div className="flex flex-wrap gap-2">
          {[t.example1, t.example2].map((q) => (
            <Button key={q} variant="outline" className="h-auto min-h-12 whitespace-normal px-4 py-2 text-base" onClick={() => ask(q)}>
              {q}
            </Button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="flex flex-col gap-2 rounded-2xl border bg-card-lead p-3"
      >
        <label className="px-1 font-medium" htmlFor="ask-input">{t.label}</label>
        <Input
          id="ask-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={answer ? t.askAnother : t.placeholder}
          disabled={saving}
          className="h-14 rounded-[1.125rem] border-input bg-popover px-4 text-base"
        />
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" className="h-12 px-4" disabled={saving || listening} onClick={listen}>
            <Mic className="size-5!" aria-hidden />
            {listening ? t.listening : t.listen}
          </Button>
          <Button type="submit" className="h-12 px-5 font-semibold" disabled={saving || !question.trim()}>
            <Send className="size-5!" aria-hidden />
            {t.send}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">{t.privacy}</p>
    </div>
  );
}

export default AskPage;
