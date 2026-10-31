"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import { formatDate, toLocaleDigits } from "@/lib/digits";

type Wellness = {
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: 1 | 2 | 3 | 4;
  symptomLevel?: "none" | "mild" | "moderate" | "severe";
  symptoms?: string[];
};

type Record = {
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
};

type Session = { user?: { id?: string; email?: string } };

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(Date.now() - 29 * 86_400_000)
  .toISOString()
  .slice(0, 10);

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

export function ReportView({ embedded = false }: { embedded?: boolean }) {
  const { dict, locale } = useLocale();
  const n = (v: number) => toLocaleDigits(String(v), locale);
  const sym = (s: string) => (dict.symptomName as { [k: string]: string })[s] ?? s;
  const [from, setFrom] = useState<string>(THIRTY_DAYS_AGO);
  const [to, setTo] = useState<string>(TODAY);
  const [records, setRecords] = useState<Record[]>([]);
  const [wellness, setWellness] = useState<Wellness[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Split dated and undated records
  const datedRecords = records.filter((r) => r.recordDate != null && r.recordDate >= from && r.recordDate <= to);
  const undatedRecords = records.filter((r) => r.recordDate == null);

  const print = () => window.print();
  const generatedOn = formatDate(new Date(), locale);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6">
      <div className="no-print flex flex-col gap-4">
        {!embedded && <h1 className="text-2xl font-bold">{dict.report.title}</h1>}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {dict.report.from}
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 min-w-0 text-base text-foreground" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            {dict.report.to}
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 min-w-0 text-base text-foreground" />
          </label>
          <Button onClick={load} disabled={loading} variant="outline" className="h-11">
            {loading ? dict.common.loading : dict.report.refresh}
          </Button>
          <Button onClick={print} className="h-11">
            {dict.report.print}
          </Button>
        </div>
      </div>

      {loading && <div className="h-64 flex items-center justify-center">{dict.common.loading}</div>}

      {!loading && (
        <div className="print-section flex min-w-0 flex-col gap-4">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold">{dict.report.doctorReport}</h2>
            <p className="text-sm text-muted-foreground">
              {session?.user?.email ?? ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {dict.report.generatedOn} {generatedOn}
            </p>
          </div>

          {/* Dated records */}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{dict.report.recordsMeds}</CardTitle>
            </CardHeader>
            <CardContent>
              {datedRecords.length === 0 && undatedRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">{dict.report.noRecords}</p>
              ) : (
                <>
                  {datedRecords.length > 0 && (
                    <ul className="space-y-4">
                      {datedRecords.map((r) => (
                        <li key={r.id} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">
                              {dict.recordType[r.recordType as keyof typeof dict.recordType] ?? r.recordType}
                            </span>
                            <Badge variant="outline" className="text-sm">
                              {r.recordDate ? formatDate(r.recordDate, locale) : dict.report.undated}
                            </Badge>
                          </div>
                          {r.observations.map((o) => {
                            const outOfRange = isOutOfRange(o.rawValue, o.referenceRangeRaw);
                            return (
                              <p key={o.name} className="text-sm ml-2">
                                {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
                                {o.referenceRangeRaw ? (
                                  <span className="text-sm text-muted-foreground ml-1">
                                    ({o.referenceRangeRaw}){outOfRange ? " " + dict.report.outsideRange : ""}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground ml-1"> ({dict.report.noRange})</span>
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
                                  {m.uncertain ? " (" + dict.report.uncertain + ")" : ""}
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
                                {dict.recordType[r.recordType as keyof typeof dict.recordType] ?? r.recordType}
                              </span>
                              <Badge variant="outline" className="text-sm">
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
                                    {m.uncertain ? " (" + dict.report.uncertain + ")" : ""}
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

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{dict.report.wellness}</CardTitle>
            </CardHeader>
            <CardContent>
              {wellness.length === 0 ? (
                <p className="text-sm text-muted-foreground">{dict.report.noCheckins}</p>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3 font-medium">{dict.report.colDate}</th>
                        <th className="py-2 pr-3 font-medium">{dict.chart.sleep}</th>
                        <th className="py-2 pr-3 font-medium">{dict.chart.water}</th>
                        <th className="py-2 pr-3 font-medium">{dict.chart.activity}</th>
                        <th className="py-2 pr-3 font-medium">{dict.timeline.energy}</th>
                        <th className="py-2 font-medium">{dict.timeline.symptoms}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wellness.map((w) => (
                        <tr key={w.date} className="border-b last:border-0 align-top">
                          <td className="whitespace-nowrap py-2 pr-3">{formatDate(w.date, locale, { withYear: false })}</td>
                          <td className="py-2 pr-3">{w.sleepHours != null ? `${n(w.sleepHours)} ${dict.checkin.hrs}` : "–"}</td>
                          <td className="py-2 pr-3">{w.waterGlasses != null ? `${n(w.waterGlasses)} ${dict.checkin.glasses}` : "–"}</td>
                          <td className="py-2 pr-3">{w.activityMinutes != null ? `${n(w.activityMinutes)} ${dict.checkin.min}` : "–"}</td>
                          <td className="py-2 pr-3">{w.energy != null ? `${n(w.energy)}/${n(4)}` : "–"}</td>
                          <td className={w.symptoms?.some((x) => ["chest pain", "difficulty breathing", "fainting", "severe bleeding", "confusion", "stroke signs"].includes(x)) ? "py-2 font-medium text-destructive" : "py-2"}>
                            {w.symptoms?.length ? w.symptoms.map(sym).join(", ") : "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {summary && (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>{dict.report.latestSummary}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{summary.payload.summary}</p>
                {summary.payload.questionsForDoctor.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-semibold mb-1">{dict.report.questionsForDoctor}</h3>
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

          <p className="text-sm text-muted-foreground mt-6">
            {dict.report.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

