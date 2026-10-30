"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n";

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

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(Date.now() - 29 * 86_400_000)
  .toISOString()
  .slice(0, 10);

export function ReportPage({ dict }: { dict: Dictionary }) {
  const [from, setFrom] = useState<string>(THIRTY_DAYS_AGO);
  const [to, setTo] = useState<string>(TODAY);
  const [records, setRecords] = useState<Record[]>([]);
  const [wellness, setWellness] = useState<Wellness[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [rRes, wRes, sRes] = await Promise.all([
        fetch(`/api/medical-records?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        fetch(`/api/wellness?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
        fetch("/api/summaries"),
      ]);
      const r = await rRes.json();
      const w = await wRes.json();
      const s = await sRes.json();
      setRecords(r.records ?? []);
      setWellness(w.entries ?? []);
      setSummary(s.summary ?? null);
    } catch {
      // silent; empty state shown
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [from, to]);

  const print = () => window.print();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto no-print">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{dict.report.title}</h1>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">To</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button onClick={load} disabled={loading} className="min-h-[44px]">
            {dict.common.loading}
          </Button>
          <Button
            onClick={print}
            variant="outline"
            className="min-h-[44px]"
          >
            {dict.report.print}
          </Button>
        </div>
      </div>

      {loading && <div className="h-64 flex items-center justify-center">Loading…</div>}

      {!loading && (
        <div className="print-section">
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold">Doctor Report</h2>
            <p className="text-sm text-muted-foreground">
              {from} to {to}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Records &amp; medications (as written)</CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground">No confirmed records in range.</p>
              ) : (
                <ul className="space-y-4">
                  {records.map((r) => (
                    <li key={r.id} className="border-b pb-3 last:border-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{r.recordType}</span>
                        <Badge variant="outline" className="text-xs">
                          {r.recordDate ?? "—"}
                        </Badge>
                      </div>
                      {r.observations.map((o) => (
                        <p key={o.name} className="text-sm ml-2">
                          {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""} (
                          {o.referenceRangeRaw ?? "no range"})
                        </p>
                      ))}
                      {r.medications.length > 0 && (
                        <ul className="text-sm ml-4 mt-2 list-disc">
                          {r.medications.map((m) => (
                            <li key={m.nameAsWritten}>
                              {m.nameAsWritten} — {m.doseAsWritten},{" "}
                              {m.frequencyAsWritten}, {m.durationAsWritten}
                              {m.uncertain ? " (uncertain)" : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wellness check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              {wellness.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No check-ins in range.
                </p>
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
                <CardTitle>Latest summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{summary.payload.summary}</p>
                {summary.payload.questionsForDoctor.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-xs font-semibold mb-1">Questions for doctor</h3>
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
            Generated from your confirmed records. This is not a diagnostic
            tool; please discuss with a doctor.
          </p>
        </div>
      )}
    </div>
  );
}

export default ReportPage;
