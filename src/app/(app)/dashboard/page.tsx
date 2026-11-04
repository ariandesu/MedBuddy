import Link from "next/link";
import {
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  ScanSearch,
  Stethoscope,
  FileText,
  Check,
  Footprints,
  GlassWater,
  HeartPulse,
  Repeat,
  Zap,
} from "lucide-react";
import { DemoSwitchButton } from "@/components/demo-switch-button";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { todayISODate } from "@/server/dates";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import { RangeBar } from "@/components/range-bar";
import { Tile } from "@/components/tile";
import { previousObservation } from "@/lib/range";
import { Badge } from "@/components/ui/badge";
import { SleepWeek } from "@/components/sleep-week";
import { weekEstimates, weeklyAverages } from "@/server/trends";
import { DEMO_EMAIL, isDemoAccountEmail } from "@/lib/demo";
import { PageTitle } from "@/components/page-title";

export const dynamic = "force-dynamic";

type NextStep = {
  title: string;
  body: string;
  cta: string;
  href: string;
  Icon: React.ElementType;
};

export default async function DashboardPage() {
  const { dict, locale } = await getLocaleAndDict();
  const t = dict.dashboard;
  const user = await getSessionUser();
  const repo = getRepo();

  const today = todayISODate();
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.parse(`${today}T00:00:00Z`) - (6 - i) * 86_400_000).toISOString().slice(0, 10)
  );
  // Parallel: each Mongo query costs a full Atlas RTT from serverless.
  const [docs, week, summary, records] = await Promise.all([
    user ? repo.listDocuments(user.id) : Promise.resolve([]),
    user ? repo.listWellnessEntries(user.id, weekDates[0], today) : Promise.resolve([]),
    user ? repo.getLatestHealthSummary(user.id) : Promise.resolve(null),
    user ? repo.listMedicalRecords(user.id) : Promise.resolve([]),
  ]);
  const needsReview = docs.filter((d) => d.status === "needs_review");
  const todayCheckin = week.some((w) => w.date === today);
  const sleepByDate = new Map(week.map((w) => [w.date, w.sleepHours ?? null]));
  const sleepPoints = weekDates.map((date) => ({ date, value: sleepByDate.get(date) ?? null }));
  const sleepAverage = weeklyAverages(week).sleepHours;

  // Latest value for each lab test, newest report first.
  const latestLab = records
    .filter((r) => r.recordType === "lab_report")
    .sort((a, b) => (b.recordDate ?? "").localeCompare(a.recordDate ?? ""))[0];

  const n = (v: number) => toLocaleDigits(String(v), locale);

  // Exactly one "what to do now" card, chosen by priority.
  const next: NextStep =
    docs.length === 0
      ? { title: t.nextUploadTitle, body: t.nextUploadBody, cta: t.nextUploadCta, href: "/records?add=1", Icon: FilePlus2 }
      : needsReview.length > 0
        ? {
            title: needsReview.length === 1 ? t.nextReviewTitleOne : t.nextReviewTitle.replace("{{count}}", n(needsReview.length)),
            body: t.nextReviewBody,
            cta: t.nextReviewCta,
            href: `/documents/${needsReview[0].id}`,
            Icon: ScanSearch,
          }
        : !todayCheckin
          ? { title: t.nextCheckinTitle, body: t.nextCheckinBody, cta: t.nextCheckinCta, href: "/checkin", Icon: ClipboardCheck }
          : { title: t.nextDoneTitle, body: t.nextDoneBody, cta: t.nextDoneCta, href: "/show-doctor", Icon: Stethoscope };

  const estimates = weekEstimates(week);
  const about = (v: number) => t.about.replace("{{value}}", toLocaleDigits(String(v), locale));
  const estimateCells = [
    estimates.waterGlasses != null && { label: dict.checkin.waterLabel, value: about(estimates.waterGlasses), unit: t.perDayGlasses, Icon: GlassWater },
    estimates.activityMinutes != null && { label: dict.checkin.activityLabel, value: about(estimates.activityMinutes), unit: t.perDayMinutes, Icon: Footprints },
    estimates.energy != null && { label: dict.checkin.energy, value: about(estimates.energy), unit: t.energyUnit, Icon: Zap },
    estimates.symptomAnsweredDays > 0 && {
      label: t.symptomFreeLabel,
      value: n(estimates.symptomFreeDays),
      unit: t.ofDaysAnswered.replace("{{count}}", n(estimates.symptomAnsweredDays)),
      Icon: HeartPulse,
    },
  ].filter((cell) => cell !== false);

  const demoAccount = isDemoAccountEmail(user?.email);
  const showTour = demoAccount || user?.email === DEMO_EMAIL;
  const tourSteps = [
    { href: "/records", title: t.tourStep1, body: t.tourStep1Body },
    { href: "/records", title: t.tourStep2, body: t.tourStep2Body },
    { href: "/ask", title: t.tourStep3, body: t.tourStep3Body },
    { href: "/show-doctor", title: t.tourStep4, body: t.tourStep4Body },
  ];
  const rowClass = "flex min-h-[4.25rem] items-center gap-3 py-2 hover:bg-card-lead focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageTitle overline={formatDate(today, locale)} title={t.greeting} />

      <section aria-labelledby="next-h" className="flex flex-col gap-4 rounded-2xl border bg-card-lead p-4">
        <div className="flex items-center gap-3">
          <Tile variant="lead"><next.Icon className="size-8" /></Tile>
          <div className="min-w-0">
            <h2 id="next-h" className="font-heading text-xl font-semibold">{next.title}</h2>
            <p className="text-muted-foreground">{next.body}</p>
          </div>
        </div>
        <Link
          href={next.href}
          className="flex h-14 items-center justify-center rounded-full bg-primary px-5 text-center text-lg font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {next.cta}
        </Link>
      </section>

      <section aria-labelledby="results-h" className="rounded-2xl border bg-card px-4 pt-3 pb-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="results-h" className="font-heading text-lg font-semibold">{t.latestResults}</h2>
          {latestLab?.recordDate && (
            <time className="text-sm text-muted-foreground" dateTime={latestLab.recordDate}>
              {formatDate(latestLab.recordDate, locale)}
            </time>
          )}
        </div>
        {latestLab && latestLab.observations.length > 0 ? (
          <div className="divide-y">
            {latestLab.observations.slice(0, 4).map((o) => (
              <RangeBar
                key={o.name}
                name={o.name}
                value={o.numericValue}
                rawValue={o.rawValue}
                unit={o.unit}
                referenceRangeRaw={o.referenceRangeRaw}
                dict={dict}
                locale={locale}
                previous={previousObservation(records, o, latestLab.recordDate)}
              />
            ))}
          </div>
        ) : (
          <div className="pb-3">
            <div aria-hidden className="relative mt-3 h-3.5 rounded-full bg-muted">
              <div className="absolute inset-y-0 left-1/4 right-1/4 bg-chart-1/35" />
            </div>
            <p className="mt-2 text-muted-foreground">{t.noResultBody}</p>
          </div>
        )}
      </section>

      {sleepAverage != null && <SleepWeek points={sleepPoints} average={sleepAverage} dict={dict} locale={locale} />}

      {estimateCells.length > 0 && (
        <section aria-labelledby="estimates-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 id="estimates-h" className="font-heading text-lg font-semibold">{t.estimatesTitle}</h2>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
            {estimateCells.map(({ label, value, unit, Icon }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {label}
                </dt>
                <dd className="font-heading text-xl font-semibold tabular-nums">
                  {value}{" "}
                  <span className="block text-sm font-normal text-muted-foreground">{unit}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted-foreground">{t.estimatesNote}</p>
        </section>
      )}

      <nav aria-label={t.title}>
        <ul className="divide-y rounded-2xl border bg-card px-4">
          <li>
            <Link href="/checkin" className={rowClass}>
              <Tile><ClipboardCheck className="size-5" /></Tile>
              <span className="flex-1 font-medium">{t.checkinToday}</span>
              {todayCheckin ? (
                <Badge><Check aria-hidden />{t.checkinDone}</Badge>
              ) : (
                <Badge variant="secondary">{t.checkinPending}</Badge>
              )}
            </Link>
          </li>
          <li>
            <Link href="/records" className={rowClass}>
              <Tile><FileText className="size-5" /></Tile>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t.allRecords}</span>
                {docs.length > 0 && (
                  <span className="block text-sm text-muted-foreground">{t.papersCount.replace("{{count}}", n(docs.length))}</span>
                )}
              </span>
              <ChevronRight className="size-5 shrink-0" aria-hidden />
            </Link>
          </li>
          <li>
            <Link href="/show-doctor" className={rowClass}>
              <Tile><Stethoscope className="size-5" /></Tile>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{dict.showDoctor.title}</span>
                {summary && (
                  <span className="block text-sm text-muted-foreground">
                    {t.summaryFrom.replace("{{date}}", formatDate(summary.generatedAt, locale))}
                  </span>
                )}
              </span>
              <ChevronRight className="size-5 shrink-0" aria-hidden />
            </Link>
          </li>
        </ul>
      </nav>

      {showTour && (
        <details className="group">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {demoAccount ? t.tourLinkDemo : t.tourLink}
          </summary>
          <div className="mt-2 flex flex-col gap-4">
            <section aria-labelledby="tour-h" className="rounded-2xl border bg-card p-4">
              <h2 id="tour-h" className="font-heading text-lg font-semibold">{t.tourTitle}</h2>
              <ol className="mt-2 flex flex-col gap-2 text-sm">
                {tourSteps.map((step) => (
                  <li key={step.title}>
                    <Link href={step.href} className="inline-flex min-h-12 items-center font-medium underline underline-offset-4">{step.title}</Link>
                    <p className="text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </section>
            {demoAccount && (
              <section aria-labelledby="switch-h" className="rounded-2xl border bg-card p-4">
                <h2 id="switch-h" className="flex items-center gap-2 font-heading text-lg font-semibold">
                  <Repeat className="size-5" aria-hidden />
                  {t.switchDemo}
                </h2>
                <p className="mt-1 text-muted-foreground">{t.switchDemoBody}</p>
                <DemoSwitchButton label={t.switchDemo} />
              </section>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
