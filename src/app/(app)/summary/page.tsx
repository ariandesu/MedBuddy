import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { GenerateSummaryButton } from "@/components/generate-summary-button";

const RECORD_TYPE_LABELS: Record<string, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  other: "Other",
};

export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const { dict } = await getLocaleAndDict();
  const user = await getSessionUser();
  const repo = getRepo();
  const summary = user ? await repo.getLatestHealthSummary(user.id) : null;

  // Build source labels for observed changes
  const sourceLabels = new Map<string, string>();
  if (user && summary) {
    for (const c of summary.payload.observedChanges) {
      for (const id of c.sourceRecordIds) {
        if (!sourceLabels.has(id)) {
          const rec = await repo.getMedicalRecord(user.id, id);
          if (rec) {
            const typeLabel =
              RECORD_TYPE_LABELS[rec.recordType] ?? rec.recordType;
            sourceLabels.set(id, `${typeLabel} · ${rec.recordDate ?? "Undated"}`);
          } else {
            sourceLabels.set(id, id);
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">{dict.summary.title}</h1>
      <GenerateSummaryButton dict={dict} />

      {!user || !summary ? (
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          {dict.summary.empty}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="prose prose-sm max-w-none">
            <p>{summary.payload.summary}</p>
          </div>

          {summary.payload.observedChanges.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">{dict.summary.changesObserved}</h2>
              <ul className="space-y-2 text-sm">
                {summary.payload.observedChanges.map((c) => (
                  <li key={c.description} className="border-l border-primary pl-3 py-1">
                    <p>{c.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {dict.summary.uncertainty}: {c.uncertainty}
                    </p>
                    {c.sourceRecordIds.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {dict.summary.sourceRecords}:{" "}
                        {c.sourceRecordIds.map((id) => (
                          <span
                            key={id}
                            className="underline underline-offset-4 hover:underline cursor-pointer"
                            title={sourceLabels.get(id) ?? id}
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
              <h2 className="text-lg font-semibold">{dict.summary.missingInfo}</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.payload.missingInformation.map((m) => (
                  <li key={m}>• {m}</li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.questionsForDoctor.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">{dict.summary.questionsForDoctor}</h2>
              <ul className="space-y-1 text-sm">
                {summary.payload.questionsForDoctor.map((q) => (
                  <li key={q}>• {q}</li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.limitations.length > 0 && (
            <section className="border rounded-lg p-3 bg-amber-50 text-amber-800 text-sm">
              <h2 className="text-sm font-semibold mb-2">{dict.summary.limitations}</h2>
              <ul className="space-y-1">
                {summary.payload.limitations.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            {dict.summary.generated} {new Date(summary.generatedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })} • {summary.isSample ? "Sample (demo)" : summary.model} •
            {summary.sourceRecordIds.length} {dict.summary.sourceRecords}
          </p>
        </div>
      )}
    </div>
  );
}
