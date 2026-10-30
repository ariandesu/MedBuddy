import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { GenerateSummaryButton } from "@/components/generate-summary-button";

export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const { dict } = await getLocaleAndDict();
  const user = await getSessionUser();
  const repo = getRepo();
  const summary = user ? await repo.getLatestHealthSummary(user.id) : null;

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
              <h2 className="text-lg font-semibold">Changes observed</h2>
              <ul className="space-y-2 text-sm">
                {summary.payload.observedChanges.map((c) => (
                  <li key={c.description} className="border-l border-primary pl-3 py-1">
                    <p>{c.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Uncertainty: {c.uncertainty}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.missingInformation.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Missing information</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.payload.missingInformation.map((m) => (
                  <li key={m}>• {m}</li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.questionsForDoctor.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold">Questions for your doctor</h2>
              <ul className="space-y-1 text-sm">
                {summary.payload.questionsForDoctor.map((q) => (
                  <li key={q}>• {q}</li>
                ))}
              </ul>
            </section>
          )}

          {summary.payload.limitations.length > 0 && (
            <section className="border rounded-lg p-3 bg-amber-50 text-amber-800 text-sm">
              <h2 className="text-sm font-semibold mb-2">Limitations</h2>
              <ul className="space-y-1">
                {summary.payload.limitations.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            Generated {new Date(summary.generatedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })} • {summary.isSample ? "Sample (demo)" : summary.model} •
            {summary.sourceRecordIds.length} source record(s)
          </p>
        </div>
      )}
    </div>
  );
}
