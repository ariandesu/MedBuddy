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
} from "lucide-react";

export function AskPage() {
  const dict = useDictionary();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<{ id: string; label: string }[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6 max-w-xl mx-auto">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="size-5 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">{dict.ask.title}</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Questions are answered using only your confirmed records and latest
        summary.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleAsk} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <label className="text-sm font-medium" htmlFor="ask-input">
              Ask a question
            </label>
          </div>
          <Input
            id="ask-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={dict.ask.placeholder}
            disabled={saving}
          />
        </div>
        <Button
          type="submit"
          disabled={saving || !question.trim()}
          className="min-h-[44px] w-full flex items-center justify-center gap-2"
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
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{answer}</p>
            {citations.length > 0 && (
              <div className="border-t pt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 mb-2">
                  <LinkIcon className="size-3" aria-hidden />
                  <span className="font-semibold">{dict.ask.sources}:</span>
                </div>
                {citations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/timeline#rec-${c.id}`}
                    className="underline underline-offset-4 hover:underline"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
            {limitations.length > 0 && (
              <div className="border rounded-lg p-3 bg-amber-50 text-amber-800 text-xs">
                <div className="flex items-center gap-1 mb-2">
                  <AlertTriangle className="size-3" aria-hidden />
                  <p className="font-semibold mb-0">{dict.ask.limitations}</p>
                </div>
                <ul className="space-y-1">
                  {limitations.map((l) => (
                    <li key={l} className="flex items-center gap-1">
                      <AlertTriangle className="size-2 text-amber-600" aria-hidden />
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
