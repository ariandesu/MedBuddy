import { getLocaleAndDict } from "@/lib/i18n/server";
import { PageTabs } from "@/components/page-tabs";
import { DocumentsView } from "@/components/views/documents-view";
import { TimelineView } from "@/components/views/timeline-view";

export const dynamic = "force-dynamic";

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
