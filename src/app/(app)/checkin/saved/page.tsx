"use client";

import Link from "next/link";
import { Check, Footprints, GlassWater, Moon, Phone, TriangleAlert, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tile } from "@/components/tile";
import { PageTitle } from "@/components/page-title";
import { useLocale } from "@/components/locale-provider";
import { isRedFlag, urgentMessage } from "@/lib/safety/redflags";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import { useTodayCheckin } from "@/lib/use-today-checkin";
import { cn } from "@/lib/utils";

export default function CheckinSavedPage() {
  const { dict, locale } = useLocale();
  const t = dict.checkin;
  const { loading, today } = useTodayCheckin();
  const n = (v: number) => toLocaleDigits(String(v), locale);

  if (loading) return <Skeleton className="mx-auto h-96 w-full max-w-xl rounded-2xl" />;

  const rows = today
    ? [
        { label: t.sleepLabel, value: today.sleepHours, unit: t.hrs, Icon: Moon },
        { label: t.waterLabel, value: today.waterGlasses, unit: t.glasses, Icon: GlassWater },
        { label: t.activityLabel, value: today.activityMinutes, unit: t.min, Icon: Footprints },
        { label: t.energy, value: today.energy, unit: t.ofFour, Icon: Zap },
      ].filter((r) => r.value != null)
    : [];
  const symptomNames = (today?.symptoms ?? []).map((s) => (dict.symptomName as Record<string, string>)[s] ?? s);
  const urgent = today != null && isRedFlag({ symptomLevel: today.symptomLevel, symptoms: today.symptoms });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageTitle title={dict.dashboard.checkinToday} />

      {!today ? (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
          <p className="font-heading text-xl font-semibold">{dict.dashboard.nextCheckinTitle}</p>
          <Link href="/checkin" className={cn(buttonVariants(), "h-14 w-full text-lg font-semibold")}>
            {dict.dashboard.nextCheckinCta}
          </Link>
        </section>
      ) : (
        <>
          {/* Dismissing the dialog must not make the warning disappear. */}
          {urgent && (
            <section role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-destructive bg-popover p-4">
              <h2 className="flex items-center gap-2 font-heading text-xl font-semibold text-destructive">
                <TriangleAlert className="size-6 shrink-0" aria-hidden />
                {dict.redflag.title}
              </h2>
              <p>{urgentMessage(locale)}</p>
              <a
                href="tel:999"
                className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-destructive px-4 text-center text-lg font-semibold text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Phone className="size-5" aria-hidden />
                {t.call999}
              </a>
            </section>
          )}

          <section aria-live="polite" className="flex items-center gap-3 rounded-2xl border bg-card-lead p-4">
            <Tile variant="lead"><Check className="size-8" /></Tile>
            <div>
              <h2 className="font-heading text-xl font-semibold">{t.savedTitle}</h2>
              <p className="text-muted-foreground">{formatDate(today.date, locale)}</p>
            </div>
          </section>

          {(rows.length > 0 || symptomNames.length > 0 || today.note) && (
            <ul className="divide-y rounded-2xl border bg-card px-4">
              {rows.map(({ label, value, unit, Icon }) => (
                <li key={label} className="flex min-h-[4.25rem] items-center gap-3 py-2">
                  <Tile><Icon className="size-5" /></Tile>
                  <span className="flex-1 font-medium">{label}</span>
                  <span className="font-heading text-lg font-semibold tabular-nums">
                    {n(value as number)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
                  </span>
                </li>
              ))}
              {symptomNames.length > 0 && (
                <li className="py-3">
                  <p className="text-sm text-muted-foreground">{dict.timeline.symptoms}</p>
                  <p className="font-medium">{symptomNames.join(", ")}</p>
                </li>
              )}
              {today.note && (
                <li className="py-3">
                  <p className="text-sm text-muted-foreground">{t.note}</p>
                  <p className="break-words font-medium">{today.note}</p>
                </li>
              )}
            </ul>
          )}

          <Link href="/records?tab=timeline" className={cn(buttonVariants(), "h-14 w-full text-lg font-semibold")}>
            {t.seeTimeline}
          </Link>
          <Link href="/checkin?edit=1" className={cn(buttonVariants({ variant: "secondary" }), "h-14 w-full text-lg font-semibold")}>
            {t.change}
          </Link>
        </>
      )}
    </div>
  );
}
