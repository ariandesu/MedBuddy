"use client";

import { useEffect, useMemo, useState } from "react";
import { weeklyAverages, missingDays, deltas, series } from "@/server/trends";
import { useDictionary } from "@/lib/use-dictionary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type WellnessEntry = {
  id?: string;
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: number;
  symptomLevel?: string;
  symptoms?: string[];
};

type MedicalRecord = {
  id: string;
  documentId: string;
  recordType: string;
  recordDate: string | null;
  observations: Array<{
    name: string;
    rawValue: string;
    numericValue?: number | null;
    unit?: string | null;
    referenceRangeRaw?: string | null;
  }>;
  medications: Array<{
    nameAsWritten: string;
    doseAsWritten: string;
    frequencyAsWritten: string;
    durationAsWritten: string;
    uncertain?: boolean;
  }>;
};

type TimelineEntry = {
  date: string;
  type: "record" | "wellness";
  id: string;
  record?: MedicalRecord;
  wellness?: WellnessEntry;
};

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fillMissingDays(
  entries: WellnessEntry[],
  from: string,
  to: string
): WellnessEntry[] {
  const present = new Set(entries.map((e) => e.date));
  const filled: WellnessEntry[] = [...entries];
  let d = new Date(from);
  const end = new Date(to);
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    if (!present.has(iso)) {
      filled.push({ date: iso });
    }
    d = new Date(d.getTime() + 86_400_000);
  }
  return filled.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

const RECORD_TYPE_LABELS: Record<string, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  other: "Other",
};

export default function TimelinePage() {
  const dict = useDictionary();
  const [serverRecords, setServerRecords] = useState<MedicalRecord[]>([]);
  const [serverWellness, setServerWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const { from: FROM_DATE, to: TO_DATE } = useMemo(() => {
    /* eslint-disable-next-line */
    const to = getLocalDate();
    /* eslint-disable-next-line */
    const from = new Date(Date.now() - 29 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return { from, to };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pending = 2;

    const done = () => {
      if (!cancelled) {
        pending -= 1;
        if (pending === 0) setLoading(false);
      }
    };

    fetch(`/api/medical-records`)
      .then((res) => (res.ok ? res.json() : { records: [] }))
      .then((data) => {
        if (!cancelled) setServerRecords(data.records ?? []);
        done();
      })
      .catch(() => done());

    fetch(`/api/wellness?from=${encodeURIComponent(FROM_DATE)}&to=${encodeURIComponent(TO_DATE)}`)
      .then((res) => (res.ok ? res.json() : { entries: [] }))
      .then((data) => {
        if (!cancelled) setServerWellness(data.entries ?? []);
        done();
      })
      .catch(() => done());

    return () => {
      cancelled = true;
    };
  }, [FROM_DATE, TO_DATE]);

  const filledWellness = fillMissingDays(serverWellness, FROM_DATE, TO_DATE);
  const avg = weeklyAverages(filledWellness);
  const missing = missingDays(serverWellness, FROM_DATE, TO_DATE);
  const delta = deltas(filledWellness);
  const wellnessSeries = series(filledWellness);

  const labGroups: Record<string, {
    points: { date: string; value: number }[];
    range: string | null;
  }> = {};
  for (const r of serverRecords) {
    if (!r.recordDate) continue;
    for (const o of r.observations) {
      if (o.numericValue != null) {
        if (!labGroups[o.name]) {
          labGroups[o.name] = { points: [], range: o.referenceRangeRaw ?? null };
        }
        labGroups[o.name].points.push({ date: r.recordDate, value: o.numericValue });
      }
    }
  }
  for (const g of Object.values(labGroups)) {
    g.points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  const merged: TimelineEntry[] = [];
  for (const r of serverRecords) {
    merged.push({ date: r.recordDate ?? "", type: "record", id: r.id, record: r });
  }
  for (const w of serverWellness) {
    merged.push({ date: w.date, type: "wellness", id: w.id ?? `well-${w.date}`, wellness: w });
  }
  merged.sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{dict.timeline.title}</h1>
        <div className="h-64 flex items-center justify-center">{dict.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.timeline.title}</h1>

      <section className="grid gap-4 md:grid-cols-3">
        {wellnessSeries.map((s) => {
          const key = s.name.toLowerCase();
          const avgKey = key.includes("sleep")
            ? "sleepHours"
            : key.includes("water")
            ? "waterGlasses"
            : "activityMinutes";
          return (
            <Card key={s.name} className="flex-1">
              <CardHeader>
                <CardTitle>{s.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full">
                  <WellnessChart
                    points={s.points}
                    title={s.name}
                    avg={delta[avgKey as keyof typeof delta]}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>{dict.timeline.averages}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {avg.sleepHours != null && (
            <div className="flex justify-between text-sm">
              <span>{dict.chart.sleep}</span>
              <span>{avg.sleepHours.toFixed(1)} hrs</span>
            </div>
          )}
          {avg.waterGlasses != null && (
            <div className="flex justify-between text-sm">
              <span>{dict.chart.water}</span>
              <span>{avg.waterGlasses.toFixed(1)} glasses</span>
            </div>
          )}
          {avg.activityMinutes != null && (
            <div className="flex justify-between text-sm">
              <span>{dict.chart.activity}</span>
              <span>{Math.round(avg.activityMinutes)} min</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{dict.timeline.daysWithData}</span>
            <span>{avg.daysWithData}</span>
          </div>
        </CardContent>
      </Card>

      {missing.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {dict.chart.missingDays.replace("{{count}}", String(missing.length))}
        </div>
      )}

      {Object.keys(labGroups).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">{dict.timeline.labTrends}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(labGroups).map(([name, g]) => (
              <Card key={name} className="flex-1">
                <CardHeader>
                  <CardTitle>{name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-40 w-full">
                    <WellnessChart points={g.points} title={name} />
                  </div>
                  {g.range && (
                    <p className="text-xs text-muted-foreground">
                      {dict.timeline.referenceRange}: {g.range}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">{dict.timeline.entries}</h2>
        {merged.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.timeline.empty}</p>
        ) : (
          <ul className="space-y-2">
            {merged.map((e) => {
              const rec = e.type === "record" ? e.record : undefined;
              return (
                <li key={e.id} className="border-b pb-2 text-sm" id={`rec-${e.id}`}>
                  {rec ? (
                    <>
                      <div className="flex justify-between">
                        <span>
                          {RECORD_TYPE_LABELS[rec.recordType] ?? rec.recordType}
                        </span>
                        <span>{rec.recordDate ?? dict.timeline.undated}</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setExplanations((prev) => ({
                              ...prev,
                              [rec.id]: "Loading…",
                            }));
                            fetch(`/api/medical-records/${rec.id}/explain`, {
                              method: "POST",
                            })
                              .then((res) => res.json())
                              .then((data) =>
                                setExplanations((prev) => ({
                                  ...prev,
                                  [rec.id]: data.plainLanguage,
                                }))
                              )
                              .catch(() =>
                                setExplanations((prev) => ({
                                  ...prev,
                                  [rec.id]: dict.common.error,
                                }))
                              );
                          }}
                          disabled={!!explanations[rec.id]}
                        >
                          {explanations[rec.id] ? (
                            <>
                              {dict.common.retry} {explanations[rec.id]}
                            </>
                          ) : (
                            dict.timeline.explain
                          )}
                        </Button>
                      </div>
                      {rec.observations.length > 0 && (
                        <ul className="text-xs text-muted-foreground mt-1">
                          {rec.observations.map((o) => (
                            <li key={o.name}>
                              {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {rec.medications.length > 0 && (
                        <ul className="text-xs text-muted-foreground mt-1 list-disc ml-4">
                          {rec.medications.map((m) => (
                            <li key={m.nameAsWritten}>
                              {m.nameAsWritten} — {m.doseAsWritten}, {m.frequencyAsWritten}, {m.durationAsWritten}
                              {m.uncertain ? " (uncertain)" : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {explanations[rec.id] && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {explanations[rec.id]}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>{dict.timeline.checkin}</span>
                        <span>{e.wellness!.date}</span>
                      </div>
                      <ul className="text-xs text-muted-foreground mt-1">
                        {e.wellness!.sleepHours != null && (
                          <li>Sleep: {e.wellness!.sleepHours} hrs</li>
                        )}
                        {e.wellness!.waterGlasses != null && (
                          <li>Water: {e.wellness!.waterGlasses}</li>
                        )}
                        {e.wellness!.activityMinutes != null && (
                          <li>Activity: {e.wellness!.activityMinutes} min</li>
                        )}
                      </ul>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function WellnessChart({
  points,
  title,
  avg,
}: {
  points: { date: string; value: number | undefined }[];
  title?: string;
  avg?: number | undefined;
}) {
  const data = points.map((p) => ({ date: p.date, value: p.value }));
  return (
    <ResponsiveContainer width="100%" height={100}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="natural" dot={false} stroke="hsl(210, 90%, 50%)" dataKey="value" />
      </LineChart>
    </ResponsiveContainer>
  );
}
