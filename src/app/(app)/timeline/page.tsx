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
import {
  FileText,
  ClipboardList,
  File,
  Moon,
  GlassWater,
  Activity,
  HeartPulse,
  Sparkles,
  Clock,
  AlertTriangle,
} from "lucide-react";

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

const RECORD_TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  lab_report: { label: "Lab report", Icon: FileText, color: "bg-blue-50 text-blue-600" },
  prescription: { label: "Prescription", Icon: ClipboardList, color: "bg-green-50 text-green-600" },
  other: { label: "Other", Icon: File, color: "bg-gray-50 text-gray-600" },
};

function renderRecordType(recordType: string): React.ReactNode {
  const config =
    RECORD_TYPE_CONFIG[recordType] ?? RECORD_TYPE_CONFIG.other;
  return (
    <>
      <config.Icon className="size-4" aria-hidden />
      <span className="font-medium text-sm">{config.label}</span>
    </>
  );
}

const WELLNESS_ICONS: Record<string, { Icon: React.ElementType; color: string }> = {
  sleep: { Icon: Moon, color: "bg-indigo-50 text-indigo-600" },
  water: { Icon: GlassWater, color: "bg-blue-50 text-blue-600" },
  activity: { Icon: Activity, color: "bg-green-50 text-green-600" },
};

export default function TimelinePage() {
  const dict = useDictionary();
  const [serverRecords, setServerRecords] = useState<MedicalRecord[]>([]);
  const [serverWellness, setServerWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const { from: FROM_DATE, to: TO_DATE } = useMemo(() => {
    const to = getLocalDate();
    // eslint-disable-next-line
    const from = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
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

  const labGroups: Record<string, { points: { date: string; value: number }[]; range: string | null }> = {};
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
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold">{dict.timeline.title}</h1>
        </div>
        <div className="h-64 flex items-center justify-center">{dict.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Clock className="size-5 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">{dict.timeline.title}</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {wellnessSeries.map((s) => {
          const key = s.name.toLowerCase();
          const avgKey = key.includes("sleep")
            ? "sleepHours"
            : key.includes("water")
            ? "waterGlasses"
            : "activityMinutes";
          const iconConfig = WELLNESS_ICONS[avgKey.replace("Hours", "").replace("Minutes", "").replace("Glasses", "")];
          return (
            <Card key={s.name} className="flex-1">
              <CardHeader className="flex items-center gap-2">
                {iconConfig && <iconConfig.Icon className="size-4" aria-hidden />}
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
        <CardHeader className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle>{dict.timeline.averages}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {avg.sleepHours != null && (
            <div className="flex items-center gap-2 text-sm">
              <Moon className="size-3 text-muted-foreground" aria-hidden />
              <span>{dict.chart.sleep}</span>
              <span className="ml-auto">{avg.sleepHours.toFixed(1)} hrs</span>
            </div>
          )}
          {avg.waterGlasses != null && (
            <div className="flex items-center gap-2 text-sm">
              <GlassWater className="size-3 text-muted-foreground" aria-hidden />
              <span>{dict.chart.water}</span>
              <span className="ml-auto">{avg.waterGlasses.toFixed(1)} glasses</span>
            </div>
          )}
          {avg.activityMinutes != null && (
            <div className="flex items-center gap-2 text-sm">
              <Activity className="size-3 text-muted-foreground" aria-hidden />
              <span>{dict.chart.activity}</span>
              <span className="ml-auto">{Math.round(avg.activityMinutes)} min</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3" aria-hidden />
            <span>{dict.timeline.daysWithData}</span>
            <span className="ml-auto">{avg.daysWithData}</span>
          </div>
        </CardContent>
      </Card>

      {missing.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="size-4" aria-hidden />
          {dict.chart.missingDays.replace("{{count}}", String(missing.length))}
        </div>
      )}

      {Object.keys(labGroups).length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="size-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold">{dict.timeline.labTrends}</h2>
          </div>
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
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="size-3" aria-hidden />
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
        <div className="flex items-center gap-2 mb-3">
          <FileText className="size-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">{dict.timeline.entries}</h2>
        </div>
        {merged.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <FileText className="size-12 text-muted-foreground mb-3" aria-hidden />
            <p className="text-sm text-muted-foreground">{dict.timeline.empty}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {merged.map((e) => {
              const rec = e.type === "record" ? e.record : undefined;
              return (
                <li key={e.id} className="border-b pb-3 last:border-0" id={`rec-${e.id}`}>
                  {rec ? (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {renderRecordType(rec.recordType)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {rec.recordDate ?? dict.timeline.undated}
                        </span>
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
                          <Sparkles className="size-3 mr-1" aria-hidden />
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
                        <ul className="text-xs text-muted-foreground mt-2">
                          {rec.observations.map((o) => (
                            <li key={o.name} className="flex items-center gap-1">
                              <FileText className="size-2 text-muted-foreground" aria-hidden />
                              {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {rec.medications.length > 0 && (
                        <ul className="text-xs text-muted-foreground mt-2 list-disc ml-4">
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
                          <span className="font-medium text-sm">{dict.timeline.checkin}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{e.wellness!.date}</span>
                      </div>
                      <ul className="text-xs text-muted-foreground mt-2">
                        {e.wellness!.sleepHours != null && (
                          <li className="flex items-center gap-1">
                            <Moon className="size-3" aria-hidden />
                            Sleep: {e.wellness!.sleepHours} hrs
                          </li>
                        )}
                        {e.wellness!.waterGlasses != null && (
                          <li className="flex items-center gap-1">
                            <GlassWater className="size-3" aria-hidden />
                            Water: {e.wellness!.waterGlasses}
                          </li>
                        )}
                        {e.wellness!.activityMinutes != null && (
                          <li className="flex items-center gap-1">
                            <Activity className="size-3" aria-hidden />
                            Activity: {e.wellness!.activityMinutes} min
                          </li>
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
