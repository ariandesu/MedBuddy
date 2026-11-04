import Link from "next/link";
import { FileText } from "lucide-react";
import { getRepo } from "@/server/repo/index";
import { getSessionUser } from "@/server/auth";
import { getLocaleAndDict } from "@/lib/i18n/server";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import { recordTitle } from "@/lib/record-title";
import { GenerateSummaryButton } from "@/components/generate-summary-button";
import { ReadAloud } from "@/components/read-aloud";

export async function SummaryView() {
  const { dict, locale } = await getLocaleAndDict();
  const t = dict.summary;
  const user = await getSessionUser();
  const repo = getRepo();
  const [summary, records] = await Promise.all([
    user ? repo.getLatestHealthSummary(user.id) : Promise.resolve(null),
    user ? repo.listMedicalRecords(user.id) : Promise.resolve([]),
  ]);

  if (!summary) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
          <p className="font-heading text-xl font-semibold">{t.empty}</p>
          <GenerateSummaryButton dict={dict} primary label={t.generate} />
        </section>
      </div>
    );
  }

  /** Every claim's way back to the paper it came from. */
  const sources = (ids: string[]) => {
    const found = ids.flatMap((id) => records.filter((r) => r.id === id));
    return (
      <>
        {found.length > 0 && (
          <ul aria-label={t.sourceRecords} className="flex flex-wrap gap-2">
            {found.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/documents/${r.documentId}`}
                  className="flex min-h-12 items-center gap-2 rounded-full border bg-secondary px-4 font-medium hover:bg-card-lead focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <FileText className="size-4 shrink-0" aria-hidden />
                  {recordTitle(r, dict, locale)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {found.length < ids.length && <p className="text-sm text-muted-foreground">{t.sourceGone}</p>}
      </>
    );
  };

  const { payload } = summary;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <section aria-labelledby="summary-h" className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="summary-h" className="font-heading text-xl font-semibold">{t.yours}</h2>
          <ReadAloud text={payload.summary} label={dict.ask.speakAnswer} />
        </div>
        <p>{payload.summary}</p>
        {sources(summary.sourceRecordIds)}
        <p className="text-sm text-muted-foreground">
          {t.madeOn
            .replace("{{date}}", formatDate(summary.generatedAt, locale))
            .replace("{{count}}", toLocaleDigits(String(summary.sourceRecordIds.length), locale))}
        </p>
      </section>

      {payload.observedChanges.length > 0 && (
        <section aria-labelledby="changes-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <h2 id="changes-h" className="font-heading text-lg font-semibold">{t.changesObserved}</h2>
          <ul className="flex flex-col gap-4">
            {payload.observedChanges.map((c) => (
              <li key={c.description} className="flex flex-col gap-2">
                <p>{c.description}</p>
                {c.uncertainty && <p className="text-sm text-muted-foreground">{t.uncertainty}: {c.uncertainty}</p>}
                {sources(c.sourceRecordIds)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {payload.questionsForDoctor.length > 0 && (
        <section aria-labelledby="questions-h" className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
          <h2 id="questions-h" className="font-heading text-lg font-semibold">{t.questionsForDoctor}</h2>
          <ul className="flex flex-col gap-2">
            {payload.questionsForDoctor.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      {payload.missingInformation.length > 0 && (
        <section aria-labelledby="missing-h" className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
          <h2 id="missing-h" className="font-heading text-lg font-semibold">{t.missingInfo}</h2>
          <ul className="flex flex-col gap-2">
            {payload.missingInformation.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      {payload.limitations.length > 0 && (
        <section aria-labelledby="limits-h" className="flex flex-col gap-1 rounded-2xl border bg-card p-4">
          <h2 id="limits-h" className="font-heading text-lg font-semibold">{t.limitations}</h2>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {payload.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>
      )}

      <GenerateSummaryButton dict={dict} label={t.makeNew} />
    </div>
  );
}
