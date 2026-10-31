import Link from "next/link";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      <h1 className="text-2xl font-bold">{dict.dashboard.title}</h1>

      {user ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.welcome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {needsReviewCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {needsReviewCount} {dict.dashboard.needsReview}
                  </span>
                  <Link
                    href={`/documents/${firstNeedsReviewDoc!.id}`}
                    className={buttonVariants({ variant: "default", size: "sm" })}
                  >
                    {dict.dashboard.reviewNow}
                  </Link>
                </div>
              )}
              {!todayCheckin && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">{dict.dashboard.todayCheckin}</span>
                  <Link
                    href="/checkin"
                    className={buttonVariants({ variant: "default", size: "sm" })}
                  >
                    {dict.dashboard.checkinNow}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.recentDocuments}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.noDocuments}
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentDocs.map((d) => (
                    <li key={d.id} className="flex justify-between text-sm">
                      <Link href={`/documents/${d.id}`}>
                        {d.fileName}
                      </Link>
                      <Badge variant="secondary">{d.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{dict.dashboard.latestSummary}</CardTitle>
            </CardHeader>
            <CardContent>
              {latestSummary ? (
                <div className="flex items-center justify-between text-sm">
                  <span>{latestSummary.generatedAt}</span>
                  <Link href="/summary">{dict.dashboard.viewSummary}</Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {dict.dashboard.noSummary}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/ask"
              className={buttonVariants({ variant: "outline", className: "min-h-[44px] w-full" })}
            >
              {dict.nav.ask}
            </Link>
            <Link
              href="/report"
              className={buttonVariants({ variant: "outline", className: "min-h-[44px] w-full" })}
            >
              {dict.nav.report}
            </Link>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{dict.dashboard.welcome}</CardTitle>
          </CardHeader>
          <CardContent>{dict.dashboard.empty}</CardContent>
        </Card>
      )}
    </div>
  );
}
