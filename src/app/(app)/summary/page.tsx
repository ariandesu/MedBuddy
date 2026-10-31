import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { GenerateSummaryButton } from "@/components/generate-summary-button";
import {
  FileText,
  ChartLine,
  MinusCircle,
  MessageCircleQuestion,
  AlertTriangle,
  Clock,
  Link,
  CheckCircle2,
} from "lucide-react";

const RECORD_TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType }> = {
  lab_report: { label: "Lab report", Icon: FileText },
  prescription: { label: "Prescription", Icon: FileText },
  other: { label: "Other", Icon: FileText },
};

export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const { dict } = await getLocaleAndDict();
  const user = await getSessionUser();
  const repo = getRepo();
  const summary = user ? await repo.getLatestHealthSummary(user.id) : null;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">{dict.summary.title}</h1>
      </div>
      <GenerateSummaryButton dict={dict} />

      {!user || !summary ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground flex flex-col items-center gap-3">
          <FileText className="size-12 text-muted-foreground" aria-hidden />
          <p>{dict.summary.empty}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="prose prose-sm max-w-none">
            <p>{summary.payload.summary}</p>
          </div>

          {summary.payload.observedChanges.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <ChartLine className="size-4 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold">{dict.summary.changesObserved}</h2>
              </div>
              <ul className="space-y-2 text-sm">
                {summary.payload.observedChanges.map((c) => (
                  <li key={c.description} className="border-l border-primary pl-3 py-1">
                    <p>{c.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {dict.summary.uncertainty}: {c.uncertainty}
                    </p>
                    {c.sourceRecordIds.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Link className="size-3" aria-hidden />
                        {dict.summary.sourceRecords}:{" "}
                        {c.sourceRecordIds.map((id) => (
                          <span
                            key={id}
                            className="underline underline-offset-4 hover:underline cursor-pointer"
                            title={id}
                          >
                            {id.slice(0, 8)}
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.missingInformation.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <MinusCircle className="size-4 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold">{dict.summary.missingInfo}</h2>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.payload.missingInformation.map((m) => (
                  <li key={m} className="flex items-center gap-1">
                    <MinusCircle className="size-3 text-muted-foreground" aria-hidden />
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.questionsForDoctor.length > 0 && (
            <section>
              <div className="flex items-center gap-2">
                <MessageCircleQuestion className="size-4 text-primary" aria-hidden />
                <h2 className="text-lg font-semibold">{dict.summary.questionsForDoctor}</h2>
              </div>
              <ul className="space-y-1 text-sm">
                {summary.payload.questionsForDoctor.map((q) => (
                  <li key={q} className="flex items-center gap-1">
                    <MessageCircleQuestion className="size-3 text-primary" aria-hidden />
                    {q}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.limitations.length > 0 && (
            <section className="border rounded-lg p-3 bg-amber-50 text-amber-800 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="size-4" aria-hidden />
                <h2 className="text-sm font-semibold">{dict.summary.limitations}</h2>
              </div>
              <ul className="space-y-1">
                {summary.payload.limitations.map((l) => (
                  <li key={l} className="flex items-center gap-1">
                    <AlertTriangle className="size-3 text-amber-600" aria-hidden />
                    {l}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {dict.summary.generated} {new Date(summary.generatedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })} • {summary.isSample ? "Sample (demo)" : summary.model} •
              {summary.sourceRecordIds.length} {dict.summary.sourceRecords}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
