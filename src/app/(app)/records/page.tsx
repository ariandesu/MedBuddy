import { getLocaleAndDict } from "@/lib/i18n/server";
import { PageTabs } from "@/components/page-tabs";
import dynamicLoader from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

// Split the heavy client chunks (tesseract.js + pdfjs in UploadZone, recharts
// in TimelineView) out of the initial records bundle so the page gets
// interactive faster. SSR still renders them; only the JS is deferred.
const DocumentsView = dynamicLoader(
  () => import("@/components/views/documents-view").then((m) => m.DocumentsView),
  { loading: () => <Skeleton className="h-64 w-full rounded-2xl" /> }
);
const TimelineView = dynamicLoader(
  () => import("@/components/views/timeline-view").then((m) => m.TimelineView),
  { loading: () => <Skeleton className="h-64 w-full rounded-2xl" /> }
);

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { dict } = await getLocaleAndDict();
  const { tab } = await searchParams;
  const active = tab === "timeline" ? "timeline" : "documents";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header>
        <h1 className="font-heading text-3xl font-semibold">{dict.records.title}</h1>
        <p className="mt-1 text-muted-foreground">{dict.records.subtitle}</p>
      </header>
      <PageTabs
        label={dict.records.title}
        active={active}
        tabs={[
          { value: "documents", label: dict.records.documents, href: "/records" },
          { value: "timeline", label: dict.records.timeline, href: "/records?tab=timeline" },
        ]}
      />
      {active === "timeline" ? <TimelineView embedded /> : <DocumentsView embedded />}
    </div>
  );
}
