import Link from "next/link";
import {
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  ScanSearch,
  Stethoscope,
  FileText,
  Check,
} from "lucide-react";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { todayISODate } from "@/server/dates";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import { RangeBar } from "@/components/range-bar";
import { cn } from "@/lib/utils";

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

  const docs = user ? await repo.listDocuments(user.id) : [];
  const needsReview = docs.filter((d) => d.status === "needs_review");
  const today = todayISODate();
  const todayCheckin = user ? (await repo.listWellnessEntries(user.id, today, today)).length > 0 : false;
  const summary = user ? await repo.getLatestHealthSummary(user.id) : null;
  const records = user ? await repo.listMedicalRecords(user.id) : [];

  // Latest value for each lab test, newest report first.
  const latestLab = records
    .filter((r) => r.recordType === "lab_report")
    .sort((a, b) => (b.recordDate ?? "").localeCompare(a.recordDate ?? ""))[0];

  const n = (v: number) => toLocaleDigits(String(v), locale);

  // Exactly one "what to do now" card, chosen by priority.
  const next: NextStep =
    docs.length === 0
      ? { title: t.nextUploadTitle, body: t.nextUploadBody, cta: t.nextUploadCta, href: "/records", Icon: FilePlus2 }
      : needsReview.length > 0
        ? {
            title: t.nextReviewTitle.replace("{{count}}", n(needsReview.length)),
            body: t.nextReviewBody,
            cta: t.nextReviewCta,
            href: `/documents/${needsReview[0].id}`,
            Icon: ScanSearch,
          }
        : !todayCheckin
          ? { title: t.nextCheckinTitle, body: t.nextCheckinBody, cta: t.nextCheckinCta, href: "/checkin", Icon: ClipboardCheck }
          : { title: t.nextDoneTitle, body: t.nextDoneBody, cta: t.nextDoneCta, href: "/show-doctor", Icon: Stethoscope };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header>
        <p className="text-muted-foreground">{formatDate(today, locale)}</p>
        <h1 className="font-heading text-3xl font-semibold">{t.greeting}</h1>
      </header>

      <section aria-labelledby="next-h" className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <next.Icon className="size-7 opacity-90" aria-hidden />
        <h2 id="next-h" className="mt-3 font-heading text-2xl font-semibold">{next.title}</h2>
        <p className="mt-1 opacity-90">{next.body}</p>
        <Link
          href={next.href}
          className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-card px-5 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-card"
        >
          {next.cta}
        </Link>
      </section>

      {latestLab && latestLab.observations.length > 0 && (
        <section aria-labelledby="results-h" className="rounded-2xl border bg-card px-4 pt-3 pb-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="results-h" className="font-heading text-lg font-semibold">{t.latestResults}</h2>
            {latestLab.recordDate && (
              <time className="text-sm text-muted-foreground" dateTime={latestLab.recordDate}>
                {formatDate(latestLab.recordDate, locale)}
              </time>
            )}
          </div>
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
              />
            ))}
          </div>
        </section>
      )}

      <nav aria-label={dict.nav.primary}>
        <ul className="divide-y rounded-2xl border bg-card">
          <li>
            <Link href="/checkin" className="flex min-h-16 items-center gap-3 px-4 hover:bg-muted/60">
              <ClipboardCheck className="size-5 text-primary" aria-hidden />
              <span className="flex-1 font-medium">{t.checkinToday}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium",
                  todayCheckin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {todayCheckin && <Check className="size-4" aria-hidden />}
                {todayCheckin ? t.checkinDone : t.checkinPending}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
          <li>
            <Link href="/records" className="flex min-h-16 items-center gap-3 px-4 hover:bg-muted/60">
              <FileText className="size-5 text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">{t.allRecords}</span>
                {docs.length > 0 && (
                  <span className="block text-sm text-muted-foreground">
                    {docs
                      .slice(0, 2)
                      .map((d) => d.fileName)
                      .join(", ")}
                  </span>
                )}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
          <li>
            <Link href="/show-doctor" className="flex min-h-16 items-center gap-3 px-4 hover:bg-muted/60">
              <Stethoscope className="size-5 text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">{dict.showDoctor.title}</span>
                {summary && (
                  <span className="block text-sm text-muted-foreground">
                    {t.summaryFrom.replace("{{date}}", formatDate(summary.generatedAt, locale))}
                  </span>
                )}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
