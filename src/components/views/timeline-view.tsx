"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";
import {
  FlaskConical,
  Pill,
  File,
  Moon,
  GlassWater,
  Footprints,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { weeklyAverages, missingDays } from "@/server/trends";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { RangeBar } from "@/components/range-bar";
import { formatDate, toLocaleDigits } from "@/lib/digits";

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

type Observation = {
  name: string;
  rawValue: string;
  numericValue?: number | null;
  unit?: string | null;
  referenceRangeRaw?: string | null;
};

type MedicalRecord = {
  id: string;
  documentId: string;
  recordType: string;
  recordDate: string | null;
  observations: Observation[];
  medications: Array<{
    nameAsWritten: string;
    doseAsWritten: string;
    frequencyAsWritten: string;
    durationAsWritten: string;
    uncertain?: boolean;
  }>;
};

type ExplainState = { status: "loading" } | { status: "done"; text: string } | { status: "error" };

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** One point per day for the last 30 days; missing days stay undefined (a gap), never 0. */
function dailySeries(entries: WellnessEntry[], key: "sleepHours" | "waterGlasses" | "activityMinutes", from: string, to: string) {
  const byDate = new Map(entries.map((e) => [e.date, e[key]]));
  const out: { date: string; value: number | null }[] = [];
  for (let d = new Date(`${from}T00:00:00`); isoDay(d) <= to; d = new Date(d.getTime() + 86_400_000)) {
    const v = byDate.get(isoDay(d));
    out.push({ date: isoDay(d), value: v ?? null });
  }
  return out;
}

const RECORD_ICON: Record<string, React.ElementType> = {
  lab_report: FlaskConical,
  prescription: Pill,
  other: File,
};

export function TimelineView({ embedded = false }: { embedded?: boolean }) {
  const { dict, locale } = useLocale();
  const t = dict.timeline;
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [wellness, setWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [explain, setExplain] = useState<Record<string, ExplainState>>({});

  const { from, to } = useMemo(() => {
    const now = new Date();
    return { to: isoDay(now), from: isoDay(new Date(now.getTime() - 29 * 86_400_000)) };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/medical-records").then((r) => (r.ok ? r.json() : { records: [] })).catch(() => ({ records: [] })),
      fetch(`/api/wellness?from=${from}&to=${to}`).then((r) => (r.ok ? r.json() : { entries: [] })).catch(() => ({ entries: [] })),
    ]).then(([rec, well]) => {
      if (cancelled) return;
      setRecords(rec.records ?? []);
      setWellness(well.entries ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  async function runExplain(id: string) {
    setExplain((p) => ({ ...p, [id]: { status: "loading" } }));
    try {
      const res = await fetch(`/api/medical-records/${id}/explain`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data?.plainLanguage) throw new Error();
      setExplain((p) => ({ ...p, [id]: { status: "done", text: data.plainLanguage } }));
    } catch {
      setExplain((p) => ({ ...p, [id]: { status: "error" } }));
    }
  }

  const avg = weeklyAverages(wellness);
  const missing = missingDays(wellness, from, to);
  const num = (v: number, digits = 1) =>
    toLocaleDigits(Number.isInteger(v) ? String(v) : v.toFixed(digits), locale);

  // Latest value per lab test (newest record first).
  const latestLabs = useMemo(() => {
    const sorted = [...records]
      .filter((r) => r.recordType === "lab_report")
      .sort((a, b) => (b.recordDate ?? "").localeCompare(a.recordDate ?? ""));
    const seen = new Map<string, Observation & { date: string | null }>();
    for (const r of sorted) for (const o of r.observations) if (!seen.has(o.name)) seen.set(o.name, { ...o, date: r.recordDate });
    return [...seen.values()];
  }, [records]);

  type Entry = { date: string; kind: "record"; rec: MedicalRecord } | { date: string; kind: "wellness"; w: WellnessEntry };
  const entries: Entry[] = [
    ...records.map((rec) => ({ date: rec.recordDate ?? "", kind: "record" as const, rec })),
    ...wellness
      .filter((w) => w.sleepHours != null || w.waterGlasses != null || w.activityMinutes != null || w.energy != null || (w.symptoms?.length ?? 0) > 0)
      .map((w) => ({ date: w.date, kind: "wellness" as const, w })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const wellnessRows = [
    { key: "sleepHours" as const, label: dict.chart.sleep, unit: dict.checkin.hrs, Icon: Moon, avg: avg.sleepHours },
    { key: "waterGlasses" as const, label: dict.chart.water, unit: dict.checkin.glasses, Icon: GlassWater, avg: avg.waterGlasses },
    { key: "activityMinutes" as const, label: dict.chart.activity, unit: dict.checkin.min, Icon: Footprints, avg: avg.activityMinutes },
  ];

  return (
    <div className="flex flex-col gap-5">
      {!embedded && <h1 className="font-heading text-3xl font-semibold">{t.title}</h1>}

      {latestLabs.length > 0 && (
        <section aria-labelledby="labs-h" className="rounded-2xl border bg-card px-4 pt-3 pb-1">
          <h2 id="labs-h" className="font-heading text-lg font-semibold">{t.labTrends}</h2>
          <div className="divide-y">
            {latestLabs.map((o) => (
              <RangeBar
                key={o.name}
                name={o.name}
                value={o.numericValue}
                rawValue={o.rawValue}
                unit={o.unit}
                referenceRangeRaw={o.referenceRangeRaw}
                dict={dict}
                locale={locale}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="well-h" className="rounded-2xl border bg-card px-4 pt-3 pb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="well-h" className="font-heading text-lg font-semibold">{dict.chart.wellnessTrends}</h2>
          <span className="text-sm text-muted-foreground">{t.average}</span>
        </div>
        <ul className="divide-y">
          {wellnessRows.map((row) => {
            const data = dailySeries(wellness, row.key, from, to);
            return (
              <li key={row.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
                <row.Icon className="size-5 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">{row.label}</p>
                  <div className="h-8 w-full max-w-64" aria-hidden>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 4, bottom: 4, left: 0, right: 0 }}>
                        <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-right font-heading text-xl font-semibold tabular-nums">
                  {row.avg != null ? num(row.avg, row.key === "activityMinutes" ? 0 : 1) : "–"}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">{row.avg != null ? row.unit : ""}</span>
                </p>
              </li>
            );
          })}
        </ul>
        {missing.length > 0 && (
          <p className="pb-2 text-sm text-muted-foreground">
            {dict.chart.missingDays.replace("{{count}}", toLocaleDigits(String(missing.length), locale))}
          </p>
        )}
      </section>

      <section aria-labelledby="entries-h">
        <h2 id="entries-h" className="mb-2 font-heading text-lg font-semibold">{t.entries}</h2>
        {entries.length === 0 ? (
          <p className="rounded-2xl border bg-card p-6 text-center text-muted-foreground">{t.empty}</p>
        ) : (
          <ol className="divide-y rounded-2xl border bg-card">
            {entries.map((e) => {
              if (e.kind === "record") {
                const { rec } = e;
                const Icon = RECORD_ICON[rec.recordType] ?? File;
                const ex = explain[rec.id];
                return (
                  <li key={`r-${rec.id}`} id={`rec-${rec.id}`} className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <h3 className="font-medium">
                            {dict.recordType[rec.recordType as keyof typeof dict.recordType] ?? dict.recordType.other}
                          </h3>
                          <time className="text-sm text-muted-foreground" dateTime={rec.recordDate ?? undefined}>
                            {rec.recordDate ? formatDate(rec.recordDate, locale) : t.undated}
                          </time>
                        </div>
                        {rec.observations.length > 0 && (
                          <ul className="mt-1 text-sm">
                            {rec.observations.map((o) => (
                              <li key={o.name}>
                                {o.name}: <span className="font-medium">{toLocaleDigits(o.rawValue, locale)}</span>
                                {o.unit ? ` ${o.unit}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                        {rec.medications.length > 0 && (
                          <ul className="mt-1 text-sm">
                            {rec.medications.map((m, i) => (
                              <li key={`${m.nameAsWritten}-${i}`}>
                                <span className="font-medium">{m.nameAsWritten}</span>
                                {[m.doseAsWritten, m.frequencyAsWritten, m.durationAsWritten].filter(Boolean).length > 0 &&
                                  ` — ${[m.doseAsWritten, m.frequencyAsWritten, m.durationAsWritten].filter(Boolean).join(", ")}`}
                                {m.uncertain && <span className="text-warning-foreground"> ({t.uncertain})</span>}
                              </li>
                            ))}
                          </ul>
                        )}

                        {ex?.status === "done" ? (
                          <div className="mt-3 rounded-xl bg-primary/8 p-3">
                            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
                              <Sparkles className="size-4" aria-hidden />
                              {t.explainTitle}
                            </p>
                            <p className="mt-1">{ex.text}</p>
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              className="h-11"
                              disabled={ex?.status === "loading"}
                              onClick={() => runExplain(rec.id)}
                            >
                              <Sparkles aria-hidden />
                              {ex?.status === "loading" ? t.explaining : ex?.status === "error" ? dict.common.retry : t.explain}
                            </Button>
                            <Link
                              href={`/documents/${rec.documentId}`}
                              className="inline-flex h-11 items-center px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                              {t.viewDocument}
                            </Link>
                            {ex?.status === "error" && (
                              <p role="alert" className="w-full text-sm text-destructive">{t.explainFailed}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              }
              const { w } = e;
              const bits: string[] = [];
              if (w.sleepHours != null) bits.push(`${dict.chart.sleep} ${num(w.sleepHours)} ${dict.checkin.hrs}`);
              if (w.waterGlasses != null) bits.push(`${dict.chart.water} ${num(w.waterGlasses)} ${dict.checkin.glasses}`);
              if (w.activityMinutes != null) bits.push(`${dict.chart.activity} ${num(w.activityMinutes)} ${dict.checkin.min}`);
              if (w.energy != null) bits.push(`${t.energy} ${num(w.energy)}/${num(4)}`);
              const sym = (w.symptoms ?? []).map(
                (s) => (dict.symptomName as Record<string, string>)[s] ?? s
              );
              return (
                <li key={`w-${w.date}`} className="flex items-start gap-3 p-4">
                  <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="font-medium">{t.checkin}</h3>
                      <time className="text-sm text-muted-foreground" dateTime={w.date}>
                        {formatDate(w.date, locale)}
                      </time>
                    </div>
                    {bits.length > 0 && (
                      <ul className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        {bits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {sym.length > 0 && (
                      <p className="text-sm">
                        {t.symptoms}: {sym.join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
