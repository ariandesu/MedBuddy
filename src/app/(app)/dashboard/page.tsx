import Link from "next/link";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Files,
  ClipboardCheck,
  ChartLine,
  FileText,
  Printer,
  AlertTriangle,
  Clock,
  Bell,
  HeartPulse,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

const DASH_ACTIONS: Array<{
  href: string;
  labelKey: keyof Dictionary["nav"];
  Icon: typeof LayoutDashboard;
  color: string;
  descKey: keyof Dictionary["dashboard"];
}> = [
  {
    href: "/documents",
    labelKey: "documents",
    Icon: Files,
    color: "bg-blue-50 text-blue-600 border-blue-100",
    descKey: "noDocuments",
  },
  {
    href: "/checkin",
    labelKey: "checkin",
    Icon: ClipboardCheck,
    color: "bg-green-50 text-green-600 border-green-100",
    descKey: "checkinCta",
  },
  {
    href: "/timeline",
    labelKey: "timeline",
    Icon: ChartLine,
    color: "bg-purple-50 text-purple-600 border-purple-100",
    descKey: "empty",
  },
  {
    href: "/ask",
    labelKey: "ask",
    Icon: AlertTriangle,
    color: "bg-amber-50 text-amber-600 border-amber-100",
    descKey: "empty",
  },
];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { dict } = await getLocaleAndDict();
  const user = await getSessionUser();
  const repo = getRepo();

  let needsReviewCount = 0;
  let firstNeedsReviewDoc: { id: string } | null = null;
  let todayCheckin = false;
  let recentDocs: Array<{ id: string; fileName: string; status: string }> = [];
  let latestSummary: { generatedAt: string; id: string } | null = null;

  if (user) {
    const docs = await repo.listDocuments(user.id);
    needsReviewCount = docs.filter((d) => d.status === "needs_review").length;
    firstNeedsReviewDoc = docs.find((d) => d.status === "needs_review") ?? null;
    recentDocs = docs
      .slice(0, 3)
      .map((d) => ({ id: d.id, fileName: d.fileName, status: d.status }));

    const today = new Date().toISOString().slice(0, 10);
    const wellness = await repo.listWellnessEntries(user.id, today, today);
    todayCheckin = wellness.length > 0;

    const summary = await repo.getLatestHealthSummary(user.id);
    if (summary) {
      latestSummary = { generatedAt: summary.generatedAt.toISOString(), id: summary.id };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{dict.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground">
            {dict.tagline}
          </p>
        </div>
        {user && (
          <div className="flex gap-2">
            <Link
              href="/documents"
              className={buttonVariants({
                variant: "default",
                size: "sm",
                className: "min-h-[44px] px-4",
              })}
            >
              <LayoutDashboard className="size-4 mr-2" aria-hidden />
              {dict.dashboard.uploadCta}
            </Link>
            <Link
              href="/checkin"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "min-h-[44px] px-4",
              })}
            >
              <ClipboardCheck className="size-4 mr-2" aria-hidden />
              {dict.dashboard.checkinCta}
            </Link>
          </div>
        )}
      </div>

      {user ? (
        <>
          {/* Quick action cards - visual and icon-based */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {DASH_ACTIONS.map((action) => {
              const Icon = action.Icon;
              const isReview = action.href === "/documents" && needsReviewCount > 0;
              const isCheckin = action.href === "/checkin" && !todayCheckin;
              return (
                <Card
                  key={action.href}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 min-h-[140px] cursor-pointer hover:shadow-md transition-shadow",
                    isReview || isCheckin ? "border-2 border-primary" : "border-border"
                  )}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${action.color}`}>
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-center leading-snug">
                    {dict.nav[action.labelKey as keyof typeof dict.nav]}
                  </span>
                  {isReview && (
                    <Badge className="mt-2" variant="destructive">
                      {needsReviewCount}
                    </Badge>
                  )}
                  {isCheckin && (
                    <Badge className="mt-2" variant="secondary">
                      {dict.common.save}
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Needs review alert */}
          {needsReviewCount > 0 && firstNeedsReviewDoc && (
            <Card className="border-l-4 border-destructive">
              <CardHeader className="flex flex-row items-center space-x-2 rtl:space-x-reverse">
                <AlertTriangle className="size-4 text-destructive" aria-hidden />
                <CardTitle className="text-sm">
                  {needsReviewCount} {dict.dashboard.needsReview}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">
                  {dict.dashboard.reviewNowDesc ?? "You have documents waiting for your review."}
                </p>
                <Link
                  href={`/documents/${firstNeedsReviewDoc.id}`}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  {dict.dashboard.reviewNow}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Today's check-in reminder */}
          {!todayCheckin && (
            <Card className="border-l-4 border-green-500">
              <CardHeader className="flex flex-row items-center space-x-2 rtl:space-x-reverse">
                <Clock className="size-4 text-green-600" aria-hidden />
                <CardTitle className="text-sm">{dict.dashboard.todayCheckin}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">
                  {dict.dashboard.checkinDesc ?? "Log your daily wellness check-in to track your health."}
                </p>
                <Link
                  href="/checkin"
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  {dict.dashboard.checkinNow}
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Recent documents & summary section */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Files className="size-4" aria-hidden />
                  {dict.dashboard.recentDocuments}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {dict.dashboard.noDocuments}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recentDocs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <Files className="size-3 text-muted-foreground" aria-hidden />
                          <Link href={`/documents/${d.id}`} className="line-clamp-1">
                            {d.fileName}
                          </Link>
                        </div>
                        <Badge
                          variant={
                            d.status === "needs_review"
                              ? "secondary"
                              : d.status === "confirmed"
                                ? "default"
                                : d.status === "failed"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {d.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="size-4" aria-hidden />
                  {dict.dashboard.latestSummary}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestSummary ? (
                  <div className="flex flex-col items-center justify-center text-center py-4">
                    <span className="text-xs text-muted-foreground mb-1">
                      {dict.summary.generated}
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(latestSummary.generatedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <Link
                      href="/summary"
                      className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3 w-full" })}
                    >
                      {dict.dashboard.viewSummary}
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-4">
                    <Printer className="size-6 text-muted-foreground mb-2" aria-hidden />
                    <p className="text-sm text-muted-foreground mb-3">
                      {dict.dashboard.noSummary}
                    </p>
                    <Link
                      href="/generate-summary"
                      className={buttonVariants({ variant: "default", size: "sm", className: "w-full" })}
                    >
                      {dict.summary.generate}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="size-4" aria-hidden />
                  {dict.nav.ask}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  {dict.dashboard.askDesc ?? "Ask questions about your health records."}
                </p>
                <Link
                  href="/ask"
                  className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}
                >
                  {dict.nav.ask}
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="flex flex-col items-center justify-center text-center py-12">
          <HeartPulse className="size-12 text-primary mb-4" aria-hidden />
          <CardHeader>
            <CardTitle>{dict.dashboard.welcome}</CardTitle>
          </CardHeader>
          <CardContent>{dict.dashboard.empty}</CardContent>
        </Card>
      )}
    </div>
  );
}
