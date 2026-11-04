"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDictionary } from "@/lib/use-dictionary";
import {
  MessageCircleQuestion,
  CheckCircle2,
  Link as LinkIcon,
  AlertTriangle,
  Search,
  Mic,
  Volume2,
} from "lucide-react";

export function AskPage() {
  const dict = useDictionary();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<{ id: string; label: string }[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAnswer(null);
    setCitations([]);
    setLimitations([]);
    setSaving(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error(dict.common.error);
      const data = await res.json();
      setAnswer(data.answer ?? dict.ask.notFound);
      setCitations(Array.isArray(data.citations) ? data.citations : []);
      setLimitations(
        Array.isArray(data.limitations) ? data.limitations : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl mx-auto">
      <header>
        <h1 className="font-heading text-3xl font-semibold">{dict.ask.title}</h1>
        <p className="mt-1 text-muted-foreground">{dict.ask.intro}</p>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleAsk} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="font-medium" htmlFor="ask-input">
            {dict.ask.label}
          </label>
          <div className="flex gap-2">
            <Input
              id="ask-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={dict.ask.examples}
              disabled={saving}
              className="h-12 text-base"
            />
            <Button
              type="button"
              variant="outline"
              className="h-12 shrink-0"
              disabled={saving || listening}
              onClick={() => {
                const SR =
                  (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void }; SpeechRecognition?: new () => { lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void } }).webkitSpeechRecognition ??
                  (window as unknown as { SpeechRecognition?: new () => { lang: string; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void } }).SpeechRecognition;
                if (!SR) {
                  setError(dict.ask.voiceNotSupported);
                  return;
                }
                try {
                  const rec = new SR();
                  const htmlLang = document.documentElement.lang || "bn";
                  rec.lang = htmlLang.startsWith("bn") ? "bn-BD" : "en-US";
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
              }}
              aria-label={dict.ask.listen}
            >
              <Mic aria-hidden />
              {listening ? dict.ask.listening : dict.ask.listen}
            </Button>
          </div>
        </div>
        <Button
          type="submit"
          disabled={saving || !question.trim()}
          className="h-12 w-full text-base flex items-center justify-center gap-2"
        >
          <Search className="size-4" aria-hidden />
          {saving ? dict.common.loading : dict.ask.send}
        </Button>
      </form>

      {answer && (
        <Card>
          <CardHeader className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            <CardTitle>{dict.ask.answer}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto h-10"
              onClick={() => {
                try {
                  speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance(answer);
                  const htmlLang = document.documentElement.lang || "bn";
                  u.lang = htmlLang.startsWith("bn") ? "bn-BD" : "en-US";
                  speechSynthesis.speak(u);
                } catch {}
              }}
            >
              <Volume2 aria-hidden />
              {dict.ask.speakAnswer}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>{answer}</p>
            {citations.length > 0 && (
              <div className="flex flex-col gap-1 border-t pt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1 mb-2">
                  <LinkIcon className="size-3" aria-hidden />
                  <span className="font-semibold">{dict.ask.sources}:</span>
                </div>
                {citations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/records?tab=timeline#rec-${c.id}`}
                    className="underline underline-offset-4 hover:underline"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
            {limitations.length > 0 && (
              <div className="rounded-xl bg-warning/15 p-3 text-sm text-warning-foreground">
                <div className="flex items-center gap-1 mb-2">
                  <AlertTriangle className="size-3" aria-hidden />
                  <p className="font-semibold mb-0">{dict.ask.limitations}</p>
                </div>
                <ul className="space-y-1">
                  {limitations.map((l) => (
                    <li key={l} className="flex items-center gap-1">
                      <AlertTriangle className="size-3" aria-hidden />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AskPage;
