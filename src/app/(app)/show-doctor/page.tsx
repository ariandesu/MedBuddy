"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/lib/use-dictionary";
import {
  FileText,
  ChartLine,
  Printer,
  Clock,
  AlertTriangle,
  MessageCircleQuestion,
  Link as LinkIcon,
  MinusCircle,
  CheckCircle2,
} from "lucide-react";

type Wellness = {
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: 1 | 2 | 3 | 4;
  symptomLevel?: "none" | "mild" | "moderate" | "severe";
  symptoms?: string[];
};

type HealthRecord = {
  id: string;
  documentId: string;
  recordType: string;
  recordDate: string | null;
  observations: { name: string; rawValue: string; numericValue?: number | null; unit?: string | null; referenceRangeRaw?: string | null }[];
  medications: { nameAsWritten: string; doseAsWritten: string; frequencyAsWritten: string; durationAsWritten: string; uncertain?: boolean }[];
};

type Summary = {
  id: string;
  payload: {
    summary: string;
    observedChanges: { description: string; sourceRecordIds: string[]; uncertainty: string }[];
    missingInformation: string[];
    questionsForDoctor: string[];
    limitations: string[];
  };
  generatedAt: string;
  isSample?: boolean;
  model?: string;
  sourceRecordIds?: string[];
};

type Session = { user?: { id?: string; email?: string } };

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);

function isOutOfRange(rawValue: string | null | undefined, referenceRangeRaw: string | null | undefined): boolean {
  if (!rawValue || !referenceRangeRaw) return false;
  const numMatch = rawValue.match(/-?\d+(\.\d+)?/);
  const rangeMatch = referenceRangeRaw.match(/^(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)$/);
  if (!numMatch || !rangeMatch) return false;
  const val = Number(numMatch[0]);
  const lo = Number(rangeMatch[1]);
  const hi = Number(rangeMatch[3]);
  return val < lo || val > hi;
}

export default function ShowDoctorPage() {
  const dict = useDictionary();
  const [from, setFrom] = useState<string>(THIRTY_DAYS_AGO);
  const [to, setTo] = useState<string>(TODAY);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [wellness, setWellness] = useState<Wellness[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "summary">("report");

  const print = () => window.print();
  const generatedOn = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  async function load() {
    setLoading(true);
    try {
      const [rRes, wRes, sRes, sesRes] = await Promise.all([
        fetch(`/api/medical-records`),
        fetch(`/api/wellness?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        fetch("/api/summaries"),
        fetch("/api/auth/session"),
      ]);
      const r = await rRes.json();
      const w = await wRes.json();
      const s = await sRes.json();
      const ses = (await sesRes.json()) as Session;
      setRecords(r.records ?? []);
      setWellness(w.entries ?? []);
      setSummary(s.summary ?? null);
      setSession(ses);
    } catch {
      // silent; empty state shown
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [from, to]);

  const datedRecords = records.filter((r) => r.recordDate != null && r.recordDate >= from && r.recordDate <= to);
  const undatedRecords = records.filter((r) => r.recordDate == null);

  const tabLabel = (key: string) => (dict.showDoctor as Record<string, string>)[key];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Printer className="size-5 text-primary" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold">{dict.showDoctor.title}</h1>
            <p className="text-sm text-muted-foreground">{dict.showDoctor.subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={print}
            variant="outline"
            className="min-h-[48px] flex items-center gap-2"
          >
            <Printer className="size-4" aria-hidden />
            {dict.showDoctor.print}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="report" className="min-h-[48px]">
            <FileText className="size-4 mr-2" aria-hidden />
            {tabLabel("doctorReport")}
          </TabsTrigger>
          <TabsTrigger value="summary" className="min-h-[48px]">
            <ChartLine className="size-4 mr-2" aria-hidden />
            {tabLabel("latestSummary")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="mt-4">
          <div className="no-print flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">{dict.showDoctor.from}</label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">{dict.showDoctor.to}</label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <Button onClick={load} disabled={loading} className="min-h-[48px]">
                {loading ? dict.common.loading : dict.showDoctor.refresh}
              </Button>
            </div>
          </div>

          {loading && <div className="h-64 flex items-center justify-center">{dict.common.loading}</div>}

          {!loading && (
            <div className="print-section">
              <div className="text-center mb-8">
                <h2 className="text-lg font-bold">{dict.showDoctor.doctorReport}</h2>
                <p className="text-sm text-muted-foreground">
                  {session?.user?.email ?? ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dict.showDoctor.generatedOn} {generatedOn}
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{dict.showDoctor.recordsMeds}</CardTitle>
                </CardHeader>
                <CardContent>
                  {datedRecords.length === 0 && undatedRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{dict.showDoctor.noRecords}</p>
                  ) : (
                    <>
                      {datedRecords.length > 0 && (
                        <ul className="space-y-4">
                          {datedRecords.map((r) => (
                            <li key={r.id} className="border-b pb-3 last:border-0">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">
                                  {(dict.recordType as Record<string, string>)[r.recordType] ?? r.recordType}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {r.recordDate ?? dict.showDoctor.noRange}
                                </Badge>
                              </div>
                              {r.observations.map((o) => {
                                const outOfRange = isOutOfRange(o.rawValue, o.referenceRangeRaw);
                                return (
                                  <p key={o.name} className="text-sm ml-2">
                                    {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
                                    {o.referenceRangeRaw ? (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ({o.referenceRangeRaw}){outOfRange ? " " + dict.showDoctor.outsideRange : ""}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground ml-1"> ({dict.showDoctor.noRange})</span>
                                    )}
                                  </p>
                                );
                              })}
                              {r.medications.length > 0 && (
                                <ul className="text-sm ml-4 mt-2 list-disc">
                                  {r.medications.map((m) => (
                                    <li key={m.nameAsWritten}>
                                      {m.nameAsWritten} — {m.doseAsWritten},{" "}
                                      {m.frequencyAsWritten}, {m.durationAsWritten}
                                      {m.uncertain ? " (" + dict.showDoctor.uncertain + ")" : ""}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {undatedRecords.length > 0 && (
                        <>
                          <h3 className="text-sm font-semibold mt-6 mb-2">{dict.report.undated}</h3>
                          <ul className="space-y-4">
                            {undatedRecords.map((r) => (
                              <li key={r.id} className="border-b pb-3 last:border-0">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">
                                    {(dict.recordType as Record<string, string>)[r.recordType] ?? r.recordType}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {dict.report.undated}
                                  </Badge>
                                </div>
                                {r.observations.map((o) => (
                                  <p key={o.name} className="text-sm ml-2">
                                    {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
                                  </p>
                                ))}
                                {r.medications.length > 0 && (
                                  <ul className="text-sm ml-4 mt-2 list-disc">
                                    {r.medications.map((m) => (
                                      <li key={m.nameAsWritten}>
                                        {m.nameAsWritten} — {m.doseAsWritten},{" "}
                                        {m.frequencyAsWritten}, {m.durationAsWritten}
                                        {m.uncertain ? " (" + dict.showDoctor.uncertain + ")" : ""}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{dict.showDoctor.wellness}</CardTitle>
                </CardHeader>
                <CardContent>
                  {wellness.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{dict.showDoctor.noCheckins}</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {wellness.map((w) => (
                        <li key={w.date} className="flex justify-between">
                          <span>{w.date}</span>
                          <span>
                            {(w.sleepHours != null ? `Sleep ${w.sleepHours}h` : "")}{" "}
                            {(w.waterGlasses != null ? `Water ${w.waterGlasses}` : "")}{" "}
                            {(w.activityMinutes != null ? `Activity ${w.activityMinutes}min` : "")}{" "}
                            {w.energy != null ? `Energy ${w.energy}/4` : ""}
                            {w.symptomLevel ? ` Symptom: ${w.symptomLevel}` : ""}
                            {w.symptoms?.length ? ` Symptoms: ${w.symptoms.join(", ")}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>{dict.showDoctor.latestSummary}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{summary.payload.summary}</p>
                    {summary.payload.questionsForDoctor.length > 0 && (
                      <div className="mt-3">
                        <h3 className="text-xs font-semibold mb-1">{dict.showDoctor.questionsForDoctor}</h3>
                        <ul className="text-sm list-disc ml-4 space-y-1">
                          {summary.payload.questionsForDoctor.map((q) => (
                            <li key={q}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground mt-6">
                {dict.showDoctor.disclaimer}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <ChartLine className="size-4 text-primary" aria-hidden />
              <CardTitle>{dict.summary.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {!summary ? (
                <div className="rounded-lg border p-6 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <FileText className="size-12 text-muted-foreground" aria-hidden />
                  <p>{dict.summary.empty}</p>
                  <Link
                    href="/summary"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {dict.summary.generate}
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="prose prose-sm max-w-none">
                    <p>{summary.payload.summary}</p>
                  </div>

                  {summary.payload.observedChanges.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2">
                        <ChartLine className="size-4 text-primary" aria-hidden />
                        <h2 className="text-lg font-semibold">{dict.summary.changesObserved}</h2>
                      </div>
                      <ul className="space-y-2 text-sm">
                        {summary.payload.observedChanges.map((c) => (
                          <li key={c.description} className="border-l border-primary pl-3 py-1">
                            <p>{c.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {dict.summary.uncertainty}: {c.uncertainty}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {summary.payload.missingInformation.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2">
                        <MinusCircle className="size-4 text-primary" aria-hidden />
                        <h2 className="text-lg font-semibold">{dict.summary.missingInfo}</h2>
                      </div>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {summary.payload.missingInformation.map((m) => (
                          <li key={m} className="flex items-center gap-1">
                            <MinusCircle className="size-3 text-muted-foreground" aria-hidden />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {summary.payload.questionsForDoctor.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2">
                        <MessageCircleQuestion className="size-4 text-primary" aria-hidden />
                        <h2 className="text-lg font-semibold">{dict.summary.questionsForDoctor}</h2>
                      </div>
                      <ul className="space-y-1 text-sm">
                        {summary.payload.questionsForDoctor.map((q) => (
                          <li key={q} className="flex items-center gap-1">
                            <MessageCircleQuestion className="size-3 text-primary" aria-hidden />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {summary.payload.limitations.length > 0 && (
                    <section className="border rounded-lg p-3 bg-amber-50 text-amber-800 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="size-4" aria-hidden />
                        <h2 className="text-sm font-semibold">{dict.summary.limitations}</h2>
                      </div>
                      <ul className="space-y-1">
                        {summary.payload.limitations.map((l) => (
                          <li key={l} className="flex items-center gap-1">
                            <AlertTriangle className="size-3 text-amber-600" aria-hidden />
                            {l}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      {dict.summary.generated} {new Date(summary.generatedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })} • {summary.isSample ? "Sample (demo)" : summary.model} •
                      {(summary.sourceRecordIds?.length ?? 0)} {dict.summary.sourceRecords}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
