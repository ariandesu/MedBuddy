import { getLocaleAndDict } from "@/lib/i18n/server";
import { PageTabs } from "@/components/page-tabs";
import { RecordsViews } from "@/components/views/records-client";
import { PageTitle } from "@/components/page-title";
import { AddPaperSheet } from "@/components/add-paper-sheet";

export const dynamic = "force-dynamic";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; add?: string }>;
}) {
  const { dict } = await getLocaleAndDict();
  const { tab, add } = await searchParams;
  const active = tab === "timeline" ? "timeline" : "documents";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageTitle title={dict.records.title} action={<AddPaperSheet key={add ?? ""} defaultOpen={add === "1"} />} />
      <PageTabs
        label={dict.records.title}
        active={active}
        tabs={[
          { value: "documents", label: dict.records.documents, href: "/records" },
          { value: "timeline", label: dict.records.timeline, href: "/records?tab=timeline" },
        ]}
      />
      <RecordsViews tab={active} />
    </div>
  );
}
