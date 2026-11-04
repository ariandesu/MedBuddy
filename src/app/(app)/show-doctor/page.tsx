import { getLocaleAndDict } from "@/lib/i18n/server";
import { PageTabs } from "@/components/page-tabs";
import { ReportView } from "@/components/views/report-view";
import { SummaryView } from "@/components/views/summary-view";
import { PageTitle } from "@/components/page-title";

export const dynamic = "force-dynamic";

export default async function ShowDoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { dict } = await getLocaleAndDict();
  const { tab } = await searchParams;
  const active = tab === "summary" ? "summary" : "report";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageTitle className="no-print" title={dict.showDoctor.title} />
      <PageTabs
        label={dict.showDoctor.title}
        active={active}
        tabs={[
          { value: "report", label: dict.showDoctor.tabReport, href: "/show-doctor" },
          { value: "summary", label: dict.showDoctor.tabSummary, href: "/show-doctor?tab=summary" },
        ]}
      />
      {active === "summary" ? <SummaryView /> : <ReportView />}
    </div>
  );
}
