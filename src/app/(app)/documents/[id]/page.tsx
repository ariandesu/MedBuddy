"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, FileText, ImageOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocale } from "@/components/locale-provider";
import { normalizeDigits, toLocaleDigits } from "@/lib/digits";
import { cn } from "@/lib/utils";
import type { Dictionary, Locale } from "@/lib/i18n";

type Field = {
  key: string;
  label: string;
  rawValue: string;
  numericValue: number | null;
  unit: string | null;
  referenceRangeRaw: string | null;
  page: number;
  sources: { muse: string | null; ocr: string | null };
  agreement: "match" | "mismatch" | "single_source";
  confidence: number | null;
  needsReview: boolean;
  userEdited: boolean;
};

type Extraction = {
  id: string;
  documentId: string;
  documentType: string;
  documentDateRaw: string | null;
  documentDate: string | null;
  fields: Field[];
  ocrText: string;
};

function parseNumber(raw: string): number | null {
  const m = normalizeDigits(raw)
    .replace(/,/g, "")
    .match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

const MED_FIELD = /^med_(\d+)_(name|dose|frequency|duration)$/;

/** "med_0_dose" → "Medicine 1 — dose" in the user's language; lab labels pass through. */
function fieldLabel(f: Field, dict: Dictionary, locale: Locale): string {
  const m = f.key.match(MED_FIELD);
  if (!m) return f.label;
  const part = dict.review.medPart[m[2] as keyof typeof dict.review.medPart];
  return `${dict.review.medicine.replace("{{n}}", toLocaleDigits(String(Number(m[1]) + 1), locale))} — ${part}`;
}

function OriginalDocument({ doc, dict, failed, onFail }: {
  doc: { id: string; mimeType: string };
  dict: Dictionary;
  failed: boolean;
  onFail: () => void;
}) {
  if (doc.mimeType === "application/pdf") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <FileText className="size-8" aria-hidden />
        <a href={`/api/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
          {dict.review.openPdf}
        </a>
      </div>
    );
  }
  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <ImageOff className="size-8" aria-hidden />
        <p>{dict.review.noPreview}</p>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/documents/${doc.id}/file`}
      alt={dict.review.originalDocumentAlt}
      className="mx-auto block max-h-[45vh] w-full object-contain md:max-h-[75vh]"
      onError={onFail}
    />
  );
}

export default function DocumentReviewPage() {
  const { dict, locale } = useLocale();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
    status: string;
  } | null>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [dRes, eRes] = await Promise.all([
        fetch(`/api/documents/${id ?? ""}`),
        fetch(`/api/extractions?documentId=${encodeURIComponent(id ?? "")}`),
      ]);

      let docData: typeof doc | null = null;
      let extData: typeof extraction | null = null;

      if (dRes.ok) {
        docData = await dRes.json();
      } else {
        docData = null;
      }

      if (eRes.ok) {
        extData = await eRes.json();
      } else {
        extData = null;
      }

      if (!cancelled) {
        setDoc(docData);
        setExtraction(extData);
        setFields(extData?.fields ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChange = (key: string, value: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.key === key
          ? {
              ...f,
              rawValue: value,
              userEdited: true,
              needsReview: false,
              numericValue:
                f.numericValue === null && !/\d/.test(normalizeDigits(value))
                  ? null
                  : parseNumber(value),
            }
          : f
      )
    );
  };

  const handleToggleReview = (key: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.key === key ? { ...f, needsReview: false } : f
      )
    );
  };

  const handleConfirm = async () => {
    const extId = extraction?.id;
    if (!extId) {
      setError(dict.review.noExtraction);
      return;
    }
    const needsReviewCount = fields.filter((f) => f.needsReview).length;
    if (needsReviewCount > 0) {
      setError(
        dict.review.checkAllFirst.replace("{{count}}", String(needsReviewCount))
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const patchRes = await fetch(`/api/extractions/${extId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      if (!patchRes.ok) throw new Error(dict.review.saveFailed);

      const confirmRes = await fetch(
        `/api/extractions/${extId}/confirm`,
        { method: "POST" }
      );
      if (!confirmRes.ok) {
        if (confirmRes.status === 409) {
          setError(dict.review.alreadyConfirmed);
        } else {
          throw new Error(dict.review.confirmFailed);
        }
        return;
      }
      await confirmRes.json();
      router.push("/records");
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  };

  const isConfirmed = doc?.status === "confirmed";

  if (loading) {
    return <div className="h-60 animate-pulse rounded-2xl bg-muted" aria-busy="true" />;
  }
  if (!doc || !extraction) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-card p-6 text-center">
        <p>{dict.review.loadFailed}</p>
        <Link href="/records" className="mt-4 inline-flex h-11 items-center font-medium text-primary underline underline-offset-4">
          {dict.nav.records}
        </Link>
      </div>
    );
  }

  const total = fields.length;
  const needsReviewCount = fields.filter((f) => f.needsReview).length;
  const done = total - needsReviewCount;
  const n = (v: number) => toLocaleDigits(String(v), locale);

  return (
    <div className="flex flex-col gap-4 pb-24 md:pb-0">
      <div>
        <Link href="/records" className="-ml-2 inline-flex h-11 items-center gap-1 rounded-lg px-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" aria-hidden />
          {dict.nav.records}
        </Link>
        <h1 className="font-heading text-3xl font-semibold">{dict.review.title}</h1>
        <p className="mt-1 break-all text-muted-foreground">{doc.fileName}</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <section aria-label={dict.review.original} className="overflow-hidden rounded-2xl border bg-muted/40 md:sticky md:top-20">
          <OriginalDocument doc={doc} dict={dict} failed={imgFailed} onFail={() => setImgFailed(true)} />
        </section>

        <section aria-labelledby="fields-h" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="fields-h" className="font-heading text-lg font-semibold">{dict.review.extracted}</h2>
            {!isConfirmed && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {dict.review.progress.replace("{{done}}", n(done)).replace("{{total}}", n(total))}
              </p>
            )}
          </div>
          {!isConfirmed && (
            <p className="text-sm text-muted-foreground">{dict.review.subtitle}</p>
          )}

          <ul className="flex flex-col gap-3">
            {fields.map((f) => {
              const label = fieldLabel(f, dict, locale);
              const inputId = `field-${f.key}`;
              const differs = f.agreement === "mismatch" && f.sources.muse !== f.sources.ocr;
              return (
                <li
                  key={f.key}
                  className={cn(
                    "rounded-2xl border bg-card p-4",
                    f.needsReview && !isConfirmed && (f.agreement === "mismatch" ? "border-warning" : "border-primary/30")
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label htmlFor={inputId} className="font-medium">{label}</label>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-sm",
                        f.agreement === "match" && "bg-primary/10 text-primary",
                        f.agreement === "mismatch" && "bg-warning/20 text-warning-foreground",
                        f.agreement === "single_source" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {dict.review.agreement[f.agreement] ?? dict.review.agreement.single_source}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id={inputId}
                      value={f.rawValue}
                      placeholder={dict.review.empty}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      disabled={isConfirmed}
                      className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-70"
                    />
                    {f.unit && <span className="text-muted-foreground">{f.unit}</span>}
                    {f.userEdited && (
                      <Pencil className="size-4 text-muted-foreground" aria-label={dict.review.edited} />
                    )}
                  </div>

                  {f.referenceRangeRaw && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {dict.review.colRefRange}: {toLocaleDigits(f.referenceRangeRaw, locale)}
                    </p>
                  )}

                  {differs && !isConfirmed && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(["muse", "ocr"] as const).map((src) => {
                        const v = f.sources[src];
                        if (!v) return null;
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() => handleChange(f.key, v)}
                            className="flex flex-col items-start rounded-xl border px-3 py-2 text-left hover:bg-muted"
                          >
                            <span className="text-sm text-muted-foreground">
                              {src === "muse" ? dict.review.readingAi : dict.review.readingOcr}
                            </span>
                            <span className="font-medium">{v}</span>
                            <span className="text-sm text-primary">{dict.review.useThis}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!isConfirmed && (
                    <div className="mt-3">
                      {f.needsReview ? (
                        <Button type="button" variant="outline" className="h-11 w-full" onClick={() => handleToggleReview(f.key)}>
                          <Check aria-hidden />
                          {dict.review.markChecked}
                        </Button>
                      ) : (
                        <p className="flex h-11 items-center justify-center gap-1.5 font-medium text-primary">
                          <Check className="size-5" aria-hidden />
                          {dict.review.checked}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {isConfirmed ? (
            <p className="flex items-center gap-2 rounded-2xl bg-primary/10 p-4 font-medium text-primary">
              <Check className="size-5" aria-hidden />
              {dict.review.alreadyConfirmed}
            </p>
          ) : (
            <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background p-3 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] md:static md:border-0 md:bg-transparent md:p-0">
              <Button
                onClick={handleConfirm}
                disabled={saving || needsReviewCount > 0}
                className="h-12 w-full text-base"
              >
                <Check aria-hidden />
                {saving ? dict.common.loading : dict.review.confirmCta}
              </Button>
              {needsReviewCount > 0 && (
                <p className="mt-1 text-center text-sm text-muted-foreground">{dict.review.confirmHint}</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
