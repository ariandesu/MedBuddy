import { getLocaleAndDict } from "@/lib/i18n/server";
import { PageTabs } from "@/components/page-tabs";
import { ReportView } from "@/components/views/report-view";
import { SummaryView } from "@/components/views/summary-view";

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
      <header className="no-print">
        <h1 className="font-heading text-3xl font-semibold">{dict.showDoctor.title}</h1>
        <p className="mt-1 text-muted-foreground">{dict.showDoctor.subtitle}</p>
      </header>
      <PageTabs
        label={dict.showDoctor.title}
        active={active}
        tabs={[
          { value: "report", label: dict.showDoctor.doctorReport, href: "/show-doctor" },
          { value: "summary", label: dict.showDoctor.latestSummary, href: "/show-doctor?tab=summary" },
        ]}
      />
      {active === "summary" ? <SummaryView embedded /> : <ReportView embedded />}
    </div>
  );
}
