"use client";

import { useEffect, useState } from "react";
import { missingDays, weeklyAverages } from "@/server/trends";
import { getSampleMedicalRecords } from "@/lib/sample-storage";
import { useDictionary } from "@/lib/use-dictionary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trend-chart";

const FROM_DATE = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
const TO_DATE = new Date().toISOString().slice(0, 10);

type WellnessEntry = {
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: number;
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

export default function TimelinePage() {
  const dict = useDictionary();

  const [serverRecords, setServerRecords] = useState<MedicalRecord[]>([]);
  const [serverWellness, setServerWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let pending = 2;

    const done = () => {
      if (!cancelled) {
        pending -= 1;
        if (pending === 0) setLoading(false);
      }
    };

    fetch(`/api/medical-records?from=${FROM_DATE}&to=${TO_DATE}`)
      .then((res) => (res.ok ? res.json() : { records: [] }))
      .then((data) => {
        if (!cancelled) setServerRecords(data.records ?? []);
        done();
      })
      .catch(() => done());

    fetch(`/api/wellness?from=${FROM_DATE}&to=${TO_DATE}`)
      .then((res) => (res.ok ? res.json() : { entries: [] }))
      .then((data) => {
        if (!cancelled) setServerWellness(data.entries ?? []);
        done();
      })
      .catch(() => done());

    return () => {
      cancelled = true;
    };
  }, []);

  // Merge server records with localStorage sample medical records.
  const sampleRecords = getSampleMedicalRecords();
  const allRecords = [...serverRecords, ...sampleRecords] as MedicalRecord[];
  const allWellness = serverWellness;

  const avg = weeklyAverages(allWellness as unknown as WellnessEntry[]);
  const missing = missingDays(
    allWellness as unknown as WellnessEntry[],
    FROM_DATE,
    TO_DATE
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">{dict.timeline.title}</h1>
        <div className="h-64 flex items-center justify-center">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.timeline.title}</h1>

      <section className="grid gap-4 md:grid-cols-2">
        <TrendChart entries={allWellness} dict={dict} missing={missing.length} />
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Averages (last 30 days)</CardTitle>
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
              <span>Days with data</span>
              <span>{avg.daysWithData}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {missing.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {dict.chart.missingDays.replace("{{count}}", String(missing.length))}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Entries</h2>
        {allRecords.length === 0 && allWellness.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.timeline.empty}</p>
        ) : (
          <ul className="space-y-2">
            {allRecords.map((r) => (
              <li key={r.id} className="border-b pb-2 text-sm">
                <div className="flex justify-between">
                  <span>{r.recordType}</span>
                  <span>{r.recordDate ?? "—"}</span>
                </div>
                {r.observations.length > 0 && (
                  <ul className="text-xs text-muted-foreground mt-1">
                    {r.observations.map((o) => (
                      <li key={o.name}>
                        {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {allWellness.map((w) => (
              <li key={w.date} className="border-b pb-2 text-sm">
                <div className="flex justify-between">
                  <span>Check-in</span>
                  <span>{w.date}</span>
                </div>
                <ul className="text-xs text-muted-foreground mt-1">
                  {w.sleepHours != null && <li>Sleep: {w.sleepHours} hrs</li>}
                  {w.waterGlasses != null && <li>Water: {w.waterGlasses}</li>}
                  {w.activityMinutes != null && (
                    <li>Activity: {w.activityMinutes} min</li>
                  )}
                  {w.energy && <li>Energy: {w.energy}/4</li>}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
