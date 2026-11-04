"use client";

import dynamicLoader from "next/dynamic";
import { Moon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import type { GapBarPoint } from "@/components/gap-bars";
import type { Dictionary, Locale } from "@/lib/i18n";

// Recharts stays out of Home's first load.
const GapBars = dynamicLoader(() => import("@/components/gap-bars").then((m) => m.GapBars), {
  ssr: false,
  loading: () => <Skeleton className="h-32 w-full rounded-xl" />,
});

/** The last seven days of sleep. Days without a check-in stay empty. */
export function SleepWeek({ points, average, dict, locale }: {
  points: GapBarPoint[];
  average: number;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.dashboard;
  const unit = dict.checkin.hrs;
  const gaps = points.filter((p) => p.value == null).length;
  const weekday = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { weekday: "short" });

  return (
    <section aria-labelledby="sleep-h" className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="sleep-h" className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Moon className="size-5" aria-hidden />
          {t.sleepWeek}
        </h2>
        <p className="font-heading text-xl font-semibold tabular-nums">
          {toLocaleDigits(average.toFixed(1), locale)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{t.sleepPerNight}</span>
        </p>
      </div>
      <GapBars
        data={points}
        label={t.sleepWeek}
        describe={(p) => `${formatDate(p.date, locale)} ${toLocaleDigits(String(p.value), locale)} ${unit}`}
      />
      <div aria-hidden className="grid grid-cols-7 text-center text-sm text-muted-foreground">
        {points.map((p) => (
          <span key={p.date}>{weekday.format(new Date(`${p.date}T00:00:00`))}</span>
        ))}
      </div>
      {gaps > 0 && (
        <p className="text-sm text-muted-foreground">
          {t.sleepGaps.replace("{{count}}", toLocaleDigits(String(gaps), locale))}
        </p>
      )}
    </section>
  );
}
