import { getRepo } from "@/server/repo/index";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { missingDays, weeklyAverages } from "@/server/trends";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/trend-chart";

const FROM_DATE = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
const TO_DATE = new Date().toISOString().slice(0, 10);

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const { dict } = await getLocaleAndDict();
  const repo = getRepo();
  // TODO: scope by user once session is wired into server components.
  const records = await repo.listMedicalRecords("demo_user_001");
  const wellness = await repo.listWellnessEntries("demo_user_001", FROM_DATE, TO_DATE);
  const avg = weeklyAverages(wellness);
  const missing = missingDays(wellness, FROM_DATE, TO_DATE);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{dict.timeline.title}</h1>

      <section className="grid gap-4 md:grid-cols-2">
        <TrendChart entries={wellness} dict={dict} missing={missing.length} />
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
        {records.length === 0 && wellness.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.timeline.empty}</p>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
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
            {wellness.map((w) => (
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
