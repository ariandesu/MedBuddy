"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/load-error";
import { MedicationList } from "@/components/medication-list";
import { RangeBar } from "@/components/range-bar";
import { useLocale } from "@/components/locale-provider";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import { parseRange, previousObservation, rangeStatus } from "@/lib/range";
import { localISODate } from "@/lib/use-today-checkin";
import { URGENT_SYMPTOMS } from "@/lib/safety/redflags";
import { weeklyAverages } from "@/server/trends";

type Wellness = {
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: 1 | 2 | 3 | 4;
  symptomLevel?: "none" | "mild" | "moderate" | "severe";
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
  medications: { nameAsWritten: string; doseAsWritten: string; frequencyAsWritten: string; durationAsWritten: string; uncertain?: boolean }[];
};

type Summary = {
  id: string;
  payload: { summary: string; questionsForDoctor: string[] };
};

type Doc = { id: string; fileName: string; status: string };

const URGENT_VALUES: string[] = URGENT_SYMPTOMS.map((s) => s.value);

function isOutOfRange(o: Observation): boolean {
  const range = parseRange(o.referenceRangeRaw);
  return range != null && o.numericValue != null && rangeStatus(o.numericValue, range) !== "normal";
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export function ReportView() {
  const { dict, locale } = useLocale();
  const t = dict.showDoctor;
  const r = dict.report;
  const n = (v: number) => toLocaleDigits(String(v), locale);
  const sym = (s: string) => (dict.symptomName as { [k: string]: string })[s] ?? s;

  // Set after mount: the server's clock isn't the phone's.
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [wellness, setWellness] = useState<Wellness[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRange({ from: localISODate(new Date(Date.now() - 29 * 86_400_000)), to: localISODate() });
  }, []);

  const from = range?.from;
  const to = range?.to;

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const get = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      return res.json();
    };
    Promise.all([
      get("/api/medical-records"),
      get(`/api/wellness?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
      get("/api/summaries"),
      get("/api/documents"),
    ])
      .then(([rec, well, sum, doc]) => {
        if (cancelled) return;
        setRecords(rec.records ?? []);
        setWellness(well.entries ?? []);
        setSummary(sum.summary ?? null);
        setDocs(doc.documents ?? []);
        setFailed(false);
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

  const shown = useMemo(
    () =>
      records
        .filter((rec) => rec.recordDate == null || (from != null && to != null && rec.recordDate >= from && rec.recordDate <= to))
        .sort((a, b) => (b.recordDate ?? "").localeCompare(a.recordDate ?? "")),
    [records, from, to]
  );

  const sourceName = (documentId: string) => docs.find((d) => d.id === documentId)?.fileName ?? "–";
  const unchecked = docs.filter((d) => d.status === "needs_review");
  const generatedOn = formatDate(new Date(), locale);

  // Latest value of each test, for the phone view. The printed page lists them all.
  const latest = useMemo(() => {
    const seen = new Map<string, Observation & { date: string | null; documentId: string }>();
    for (const rec of shown) {
      if (rec.recordType !== "lab_report") continue;
      for (const o of rec.observations) {
        if (!seen.has(o.name)) seen.set(o.name, { ...o, date: rec.recordDate, documentId: rec.documentId });
      }
    }
    return [...seen.values()];
  }, [shown]);

  const withMedicines = shown.filter((rec) => rec.medications.length > 0);
  const avg = weeklyAverages(wellness);
  const number = (v: number | undefined, digits: number) => (v != null ? toLocaleDigits(v.toFixed(digits), locale) : "–");
  const symptomDays = new Map<string, number>();
  for (const w of wellness) for (const s of w.symptoms ?? []) symptomDays.set(s, (symptomDays.get(s) ?? 0) + 1);
  const symptomsNoted = [...symptomDays.entries()]
    .map(([s, count]) => t.symptomDays.replace("{{symptom}}", sym(s)).replace("{{count}}", n(count)))
    .join(", ");

  const dateInput = "h-12 min-w-0 rounded-[1.125rem] border-input bg-popover text-base";

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-4 print:max-w-none">
      <section aria-label={t.dates} className="no-print flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 font-medium">
            {r.from}
            <Input
              type="date"
              value={from ?? ""}
              max={to}
              onChange={(e) => e.target.value && setRange((p) => (p ? { ...p, from: e.target.value } : p))}
              className={dateInput}
            />
          </label>
          <label className="flex flex-col gap-1 font-medium">
            {r.to}
            <Input
              type="date"
              value={to ?? ""}
              min={from}
              onChange={(e) => e.target.value && setRange((p) => (p ? { ...p, to: e.target.value } : p))}
              className={dateInput}
            />
          </label>
        </div>
        <Button onClick={() => window.print()} disabled={loading || failed} className="h-14 w-full gap-2 text-lg font-semibold">
          <Printer className="size-5!" aria-hidden />
          {t.printCta}
        </Button>
      </section>

      {failed ? (
        <LoadError />
      ) : loading || !from || !to ? (
        <div className="no-print flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* On the phone: what matters, at a glance. */}
          <div className="no-print flex flex-col gap-4">
            <section aria-labelledby="rec-h" className="rounded-2xl border bg-card px-4 pt-3 pb-1">
              <h2 id="rec-h" className="font-heading text-lg font-semibold">{t.recordsAsWritten}</h2>
              {latest.length === 0 ? (
                <p className="py-3 text-muted-foreground">{t.noRecords}</p>
              ) : (
                <ul className="divide-y">
                  {latest.map((o) => (
                    <li key={o.name} className="pb-2">
                      <RangeBar
                        name={o.name}
                        value={o.numericValue}
                        rawValue={o.rawValue}
                        unit={o.unit}
                        referenceRangeRaw={o.referenceRangeRaw}
                        dict={dict}
                        locale={locale}
                        previous={previousObservation(records, o, o.date)}
                        className="pb-1"
                      />
                      <p className="break-words text-sm text-muted-foreground">
                        {t.fromPaper.replace("{{name}}", sourceName(o.documentId))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="med-h" className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <h2 id="med-h" className="font-heading text-lg font-semibold">{t.medicinesAsWritten}</h2>
              {withMedicines.length === 0 ? (
                <p className="text-muted-foreground">{t.noMedicines}</p>
              ) : (
                withMedicines.map((rec) => (
                  <div key={rec.id}>
                    <MedicationList medications={rec.medications} dict={dict} />
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {t.fromPaper.replace("{{name}}", sourceName(rec.documentId))}
                    </p>
                  </div>
                ))
              )}
              {unchecked.length > 0 && (
                <Link href={`/documents/${unchecked[0].id}`} className="flex min-h-12 items-center justify-between gap-2">
                  <Badge variant="warning">{t.stillToCheck.replace("{{count}}", n(unchecked.length))}</Badge>
                  <span className="flex items-center gap-1 font-semibold">
                    {t.checkIt}
                    <ChevronRight className="size-4" aria-hidden />
                  </span>
                </Link>
              )}
            </section>

            <section aria-labelledby="well-h" className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <h2 id="well-h" className="font-heading text-lg font-semibold">{r.wellness}</h2>
              {wellness.length === 0 ? (
                <p className="text-muted-foreground">{r.noCheckins}</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    {t.checkinsCount.replace("{{logged}}", n(wellness.length)).replace("{{total}}", n(daysBetween(from, to)))}
                  </p>
                  <dl className="grid grid-cols-3 gap-2">
                    {[
                      { value: number(avg.sleepHours, 1), label: t.avgSleep },
                      { value: number(avg.waterGlasses, 1), label: t.avgWater },
                      { value: number(avg.activityMinutes, 0), label: t.avgWalking },
                    ].map((m) => (
                      <div key={m.label} className="flex flex-col-reverse">
                        <dt className="text-sm text-muted-foreground">{m.label}</dt>
                        <dd className="font-heading text-xl font-semibold tabular-nums">{m.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {symptomsNoted && <p>{t.symptomsNoted.replace("{{list}}", symptomsNoted)}</p>}
                </>
              )}
            </section>

            {summary && summary.payload.questionsForDoctor.length > 0 && (
              <section aria-labelledby="q-h" className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
                <h2 id="q-h" className="font-heading text-lg font-semibold">{r.questionsForDoctor}</h2>
                <ul className="flex flex-col gap-2">
                  {summary.payload.questionsForDoctor.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </section>
            )}

            <p className="text-center text-sm text-muted-foreground">{r.disclaimer}</p>
          </div>

          {/* On paper: everything, as written, for a doctor to scan. */}
          <article className="hidden text-[11pt] leading-snug text-black print:block" data-testid="printed-report">
            <header className="flex items-start justify-between gap-6">
              <h1 className="font-heading text-[22pt] font-semibold leading-tight">{r.doctorReport}</h1>
              <p className="text-right">
                {formatDate(from, locale)} – {formatDate(to, locale)}
                <br />
                {r.generatedOn} {generatedOn}
              </p>
            </header>

            <h2 className="print-h2">{t.recordsAsWritten}</h2>
            {shown.filter((rec) => rec.observations.length > 0).length === 0 ? (
              <p>{r.noRecords}</p>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>{r.colDate}</th>
                    <th>{t.colTest}</th>
                    <th className="text-right">{t.colValue}</th>
                    <th>{t.colRange}</th>
                    <th>{t.colSource}</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.flatMap((rec) =>
                    rec.observations.map((o) => (
                      <tr key={`${rec.id}-${o.name}`}>
                        <td className="whitespace-nowrap">{rec.recordDate ? formatDate(rec.recordDate, locale) : r.undated}</td>
                        <td>{o.name}</td>
                        <td className="whitespace-nowrap text-right font-semibold tabular-nums">
                          {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
                        </td>
                        <td>
                          {o.referenceRangeRaw ?? r.noRange}
                          {isOutOfRange(o) ? `, ${r.outsideRange}` : ""}
                        </td>
                        <td className="break-all">{sourceName(rec.documentId)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            <h2 className="print-h2">{t.medicinesAsWritten}</h2>
            {withMedicines.length === 0 ? (
              <p>{t.noMedicines}</p>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>{r.colDate}</th>
                    <th>{dict.review.medPart.name}</th>
                    <th>{dict.review.medPart.dose}</th>
                    <th>{dict.review.medPart.frequency}</th>
                    <th>{dict.review.medPart.duration}</th>
                    <th>{t.colSource}</th>
                  </tr>
                </thead>
                <tbody>
                  {withMedicines.flatMap((rec) =>
                    rec.medications.map((m, i) => (
                      <tr key={`${rec.id}-${i}`}>
                        <td className="whitespace-nowrap">{rec.recordDate ? formatDate(rec.recordDate, locale) : r.undated}</td>
                        <td className="font-semibold">
                          {m.nameAsWritten}
                          {m.uncertain ? ` (${r.uncertain})` : ""}
                        </td>
                        <td>{m.doseAsWritten || "–"}</td>
                        <td>{m.frequencyAsWritten || "–"}</td>
                        <td>{m.durationAsWritten || "–"}</td>
                        <td className="break-all">{sourceName(rec.documentId)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            {unchecked.length > 0 && <p className="mt-1">{t.notIncluded.replace("{{count}}", n(unchecked.length))}</p>}

            <h2 className="print-h2">
              {r.wellness}
              {wellness.length > 0 && `: ${t.checkinsCount.replace("{{logged}}", n(wellness.length)).replace("{{total}}", n(daysBetween(from, to)))}`}
            </h2>
            {wellness.length === 0 ? (
              <p>{r.noCheckins}</p>
            ) : (
              <table className="print-table">
                <thead>
                  <tr>
                    <th>{r.colDate}</th>
                    <th className="text-right">{dict.chart.sleep} ({dict.checkin.hrs})</th>
                    <th className="text-right">{dict.chart.water} ({dict.checkin.glasses})</th>
                    <th className="text-right">{dict.chart.activity} ({dict.checkin.min})</th>
                    <th className="text-right">{dict.timeline.energy} ({dict.checkin.ofFour})</th>
                    <th>{dict.timeline.symptoms}</th>
                  </tr>
                </thead>
                <tbody>
                  {wellness.map((w) => (
                    <tr key={w.date}>
                      <td className="whitespace-nowrap">{formatDate(w.date, locale, { withYear: false })}</td>
                      <td className="text-right tabular-nums">{w.sleepHours != null ? n(w.sleepHours) : "–"}</td>
                      <td className="text-right tabular-nums">{w.waterGlasses != null ? n(w.waterGlasses) : "–"}</td>
                      <td className="text-right tabular-nums">{w.activityMinutes != null ? n(w.activityMinutes) : "–"}</td>
                      <td className="text-right tabular-nums">{w.energy != null ? n(w.energy) : "–"}</td>
                      <td className={w.symptoms?.some((x) => URGENT_VALUES.includes(x)) ? "font-bold" : undefined}>
                        {w.symptoms?.length ? w.symptoms.map(sym).join(", ") : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {summary && (
              <>
                <h2 className="print-h2">{r.latestSummary}</h2>
                <p>{summary.payload.summary}</p>
                {summary.payload.questionsForDoctor.length > 0 && (
                  <>
                    <h2 className="print-h2">{r.questionsForDoctor}</h2>
                    <ol className="list-decimal pl-5">
                      {summary.payload.questionsForDoctor.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  </>
                )}
              </>
            )}
            <p className="mt-4">{r.disclaimer}</p>
          </article>
        </>
      )}
    </div>
  );
}
