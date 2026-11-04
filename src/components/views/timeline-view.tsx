"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Footprints, GlassWater, Moon, Sparkles, Zap } from "lucide-react";
import { weeklyAverages, missingDays } from "@/server/trends";
import { useLocale } from "@/components/locale-provider";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/load-error";
import { MedicationList } from "@/components/medication-list";
import { RangeBar } from "@/components/range-bar";
import { GapBars } from "@/components/gap-bars";
import { previousObservation } from "@/lib/range";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";

type WellnessEntry = {
  id?: string;
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: number;
  symptomLevel?: string;
  symptoms?: string[];
  note?: string;
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

export function TimelineView() {
  const { dict, locale } = useLocale();
  const t = dict.timeline;
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [wellness, setWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [metric, setMetric] = useState<"sleepHours" | "waterGlasses" | "activityMinutes">("sleepHours");

  const { from, to } = useMemo(() => {
    const now = new Date();
    return { to: isoDay(now), from: isoDay(new Date(now.getTime() - 29 * 86_400_000)) };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const get = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      return res.json();
    };
    Promise.all([get("/api/medical-records"), get(`/api/wellness?from=${from}&to=${to}`)])
      .then(([rec, well]) => {
        if (cancelled) return;
        setRecords(rec.records ?? []);
        setWellness(well.entries ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

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
      .filter((w) => w.sleepHours != null || w.waterGlasses != null || w.activityMinutes != null || w.energy != null || (w.symptoms?.length ?? 0) > 0 || w.note)
      .map((w) => ({ date: w.date, kind: "wellness" as const, w })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }
  if (failed) return <LoadError />;

  const metrics = [
    { key: "sleepHours" as const, label: dict.chart.sleep, unit: dict.checkin.hrs, Icon: Moon, avg: avg.sleepHours, digits: 1 },
    { key: "waterGlasses" as const, label: dict.chart.water, unit: dict.checkin.glasses, Icon: GlassWater, avg: avg.waterGlasses, digits: 1 },
    { key: "activityMinutes" as const, label: dict.chart.activity, unit: dict.checkin.min, Icon: Footprints, avg: avg.activityMinutes, digits: 0 },
  ];
  const current = metrics.find((m) => m.key === metric) ?? metrics[0];
  const entryTitle = (rec: MedicalRecord) =>
    dict.recordType[rec.recordType as keyof typeof dict.recordType] ?? dict.recordType.other;

  return (
    <div className="flex flex-col gap-4">
      {latestLabs.length > 0 && (
        <section aria-labelledby="labs-h" className="rounded-2xl border bg-card-lead px-4 pt-3 pb-1">
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
                previous={previousObservation(records, o, o.date)}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="well-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <h2 id="well-h" className="font-heading text-lg font-semibold">{t.yourCheckins}</h2>
        <div className="flex flex-wrap gap-2">
          {metrics.map((m) => (
            <Chip key={m.key} active={m.key === current.key} onToggle={() => setMetric(m.key)}>
              <m.Icon className="size-4" aria-hidden />
              {m.label}
            </Chip>
          ))}
        </div>
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {current.avg != null ? num(current.avg, current.digits) : "–"}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {current.avg != null && current.unit}, {t.average}
          </span>
        </p>
        <GapBars
          className="h-28"
          data={dailySeries(wellness, current.key, from, to)}
          label={`${current.label}, ${t.average}`}
          describe={(p) => `${formatDate(p.date, locale)} ${num(p.value)} ${current.unit}`}
        />
        <div aria-hidden className="flex justify-between text-sm text-muted-foreground">
          <span>{formatDate(from, locale)}</span>
          <span>{t.today}</span>
        </div>
        {missing.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {dict.chart.missingDays.replace("{{count}}", toLocaleDigits(String(missing.length), locale))}
          </p>
        )}
      </section>

      <section aria-labelledby="entries-h">
        <h2 id="entries-h" className="mb-2 font-heading text-lg font-semibold">{t.entries}</h2>
        {entries.length === 0 ? (
          <p className="rounded-2xl border bg-card p-4 text-muted-foreground">{t.empty}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {entries.map((e) => {
              if (e.kind === "record") {
                const { rec } = e;
                return (
                  <li key={`r-${rec.id}`} className="flex flex-col gap-2 rounded-2xl border bg-card-lead p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="font-heading text-lg font-semibold">{entryTitle(rec)}</h3>
                      <time className="text-sm text-muted-foreground" dateTime={rec.recordDate ?? undefined}>
                        {rec.recordDate ? formatDate(rec.recordDate, locale) : t.undated}
                      </time>
                    </div>
                    {rec.observations.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {rec.observations.map((o) => (
                          <li key={o.name} className="flex items-baseline justify-between gap-3">
                            <span>{o.name}</span>
                            <span className="font-heading font-semibold tabular-nums">
                              {toLocaleDigits(o.rawValue, locale)}
                              {o.unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{o.unit}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {rec.medications.length > 0 && <MedicationList medications={rec.medications} dict={dict} />}
                    <Link
                      href={`/documents/${rec.documentId}`}
                      className={cn(buttonVariants({ variant: "secondary" }), "mt-1 h-12 w-full gap-2 text-base font-semibold")}
                    >
                      <Sparkles aria-hidden />
                      {t.explain}
                    </Link>
                  </li>
                );
              }
              const { w } = e;
              const bits = [
                { value: w.sleepHours, unit: dict.checkin.hrs, Icon: Moon, label: dict.chart.sleep },
                { value: w.waterGlasses, unit: dict.checkin.glasses, Icon: GlassWater, label: dict.chart.water },
                { value: w.activityMinutes, unit: dict.checkin.min, Icon: Footprints, label: dict.chart.activity },
                { value: w.energy, unit: dict.checkin.ofFour, Icon: Zap, label: t.energy },
              ].filter((b) => b.value != null);
              const sym = (w.symptoms ?? []).map(
                (s) => (dict.symptomName as Record<string, string>)[s] ?? s
              );
              return (
                <li key={`w-${w.date}`} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-heading text-lg font-semibold">{t.checkin}</h3>
                    <time className="text-sm text-muted-foreground" dateTime={w.date}>
                      {formatDate(w.date, locale)}
                    </time>
                  </div>
                  {bits.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5">
                      {bits.map((b) => (
                        <li key={b.label}>
                          <Badge variant="secondary" aria-label={`${b.label}: ${num(b.value as number)} ${b.unit}`}>
                            <b.Icon aria-hidden />
                            {num(b.value as number)} {b.unit}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                  {sym.length > 0 && <p className="text-sm">{t.symptoms}: {sym.join(", ")}</p>}
                  {w.note && <p className="break-words text-sm text-muted-foreground">{w.note}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
