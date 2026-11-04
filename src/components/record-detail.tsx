"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/page-title";
import { PaperView } from "@/components/paper-view";
import { RangeBar } from "@/components/range-bar";
import { MedicationList } from "@/components/medication-list";
import { ReadAloud } from "@/components/read-aloud";
import { AiLoader } from "@/components/ai-loader";
import { DeletePaperDialog } from "@/components/delete-paper-dialog";
import { useLocale } from "@/components/locale-provider";
import { previousObservation } from "@/lib/range";
import { recordTitle } from "@/lib/record-title";

type Observation = {
  name: string;
  rawValue: string;
  numericValue?: number | null;
  unit?: string | null;
  referenceRangeRaw?: string | null;
};

type MedicalRecord = {
  id: string;
  documentId: string;
  recordType: string;
  recordDate: string | null;
  observations: Observation[];
  medications: {
    nameAsWritten: string;
    doseAsWritten: string;
    frequencyAsWritten: string;
    durationAsWritten: string;
    uncertain?: boolean;
  }[];
};

type Explanation = { status: "idle" | "loading" | "error" } | { status: "done"; text: string };

/**
 * A saved paper: what it says, kept apart from what AI makes of it. This is
 * where every source link in the app lands.
 */
export function RecordDetail({ doc }: { doc: { id: string; fileName: string; mimeType: string } }) {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const t = dict.timeline;
  const [records, setRecords] = useState<MedicalRecord[] | null>(null);
  const [explanation, setExplanation] = useState<Explanation>({ status: "idle" });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/medical-records")
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .catch(() => ({ records: [] }))
      .then((data: { records?: MedicalRecord[] }) => {
        if (!cancelled) setRecords(data.records ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (records === null) {
    return <Skeleton className="mx-auto h-96 w-full max-w-xl rounded-2xl" aria-busy="true" />;
  }

  const record = records.find((r) => r.documentId === doc.id);

  async function explain(id: string) {
    setExplanation({ status: "loading" });
    try {
      const res = await fetch(`/api/medical-records/${id}/explain`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data?.plainLanguage) throw new Error();
      setExplanation({ status: "done", text: data.plainLanguage });
    } catch {
      setExplanation({ status: "error" });
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageTitle
        title={record ? recordTitle(record, dict, locale) : doc.fileName}
        subtitle={record ? doc.fileName : undefined}
        back={{ href: "/records", label: `${dict.common.back}: ${dict.nav.records}` }}
      />

      {record ? (
        <section aria-labelledby="paper-says-h" className="rounded-2xl border bg-card-lead px-4 pt-3 pb-1">
          <h2 id="paper-says-h" className="font-heading text-lg font-semibold">{t.paperSays}</h2>
          {record.observations.length > 0 && (
            <div className="divide-y">
              {record.observations.map((o) => (
                <RangeBar
                  key={o.name}
                  name={o.name}
                  value={o.numericValue}
                  rawValue={o.rawValue}
                  unit={o.unit}
                  referenceRangeRaw={o.referenceRangeRaw}
                  dict={dict}
                  locale={locale}
                  previous={previousObservation(records, o, record.recordDate)}
                />
              ))}
            </div>
          )}
          {record.medications.length > 0 && (
            <div className="py-3">
              <p className="mb-2 text-sm text-muted-foreground">{t.medicines}</p>
              <MedicationList medications={record.medications} dict={dict} />
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-2xl border bg-card p-4">{dict.review.loadFailed}</p>
      )}

      {record && (
        <section aria-labelledby="simple-h" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <div className="flex min-h-12 items-center justify-between gap-2">
            <h2 id="simple-h" className="font-heading text-lg font-semibold">{t.inSimpleWords}</h2>
            {explanation.status === "done" && <ReadAloud text={explanation.text} label={dict.ask.speakAnswer} />}
          </div>
          {explanation.status === "done" ? (
            <>
              <p>{explanation.text}</p>
              <p className="text-sm text-muted-foreground">{t.explainNote}</p>
            </>
          ) : (
            <>
              {explanation.status === "loading" ? (
                <AiLoader label={t.explaining} />
              ) : (
                <Button variant="outline" className="h-14 w-full text-lg font-semibold" onClick={() => explain(record.id)}>
                  <Sparkles className="size-5!" aria-hidden />
                  {explanation.status === "error" ? dict.common.retry : t.explain}
                </Button>
              )}
              {explanation.status === "error" && (
                <p role="alert" className="text-sm font-medium text-destructive">{t.explainFailed}</p>
              )}
            </>
          )}
        </section>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-semibold">{t.thePaper}</h2>
        <PaperView doc={doc} dict={dict} />
      </div>

      <button
        type="button"
        onClick={() => setDeleting(true)}
        className="flex min-h-12 items-center justify-center font-medium text-destructive-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {dict.review.deletePaper}
      </button>

      {!record && (
        <Link href="/records" className="flex min-h-12 items-center justify-center font-medium underline underline-offset-4">
          {dict.nav.records}
        </Link>
      )}

      {deleting && (
        <DeletePaperDialog doc={doc} dict={dict} onClose={() => setDeleting(false)} onDeleted={() => router.push("/records")} />
      )}
    </div>
  );
}
