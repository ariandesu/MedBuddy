"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, FileText, ImageOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocale } from "@/components/locale-provider";
import { formatDate, normalizeDigits, toLocaleDigits } from "@/lib/digits";
import { parseNumericDate } from "@/lib/document-date";
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
  box?: { x: number; y: number; w: number; h: number } | null;
};

type Extraction = {
  id: string;
  documentId: string;
  documentType: string;
  documentDateRaw: string | null;
  documentDate: string | null;
  dateNeedsReview?: boolean;
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
function fieldLabel(f: Field, fields: Field[], dict: Dictionary, locale: Locale): string {
  const m = f.key.match(MED_FIELD);
  if (!m) return f.label;
  const part = dict.review.medPart[m[2] as keyof typeof dict.review.medPart];
  // Number by position: keys may start at 0 or 1.
  const ids = [...new Set(fields.map((x) => x.key.match(MED_FIELD)?.[1]).filter(Boolean))];
  const n = ids.indexOf(m[1]) + 1;
  return `${dict.review.medicine.replace("{{n}}", toLocaleDigits(String(n), locale))} — ${part}`;
}

function OriginalDocument({ doc, dict, failed, onFail, box }: {
  doc: { id: string; mimeType: string };
  dict: Dictionary;
  failed: boolean;
  onFail: () => void;
  box: Field["box"];
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
    // Sized to the image so the highlight's percentages land on the paper itself.
    <div className="relative mx-auto w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/documents/${doc.id}/file`}
        alt={dict.review.originalDocumentAlt}
        className="block max-h-[34vh] w-auto max-w-full md:max-h-[75vh]"
        onError={onFail}
      />
      {box && (
        <span
          aria-hidden
          className="paper-highlight"
          style={{
            left: `${(box.x - 0.008) * 100}%`,
            top: `${(box.y - 0.004) * 100}%`,
            width: `${(box.w + 0.016) * 100}%`,
            height: `${(box.h + 0.008) * 100}%`,
          }}
        />
      )}
    </div>
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
  const [documentDate, setDocumentDate] = useState("");
  const [dateNeedsReview, setDateNeedsReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

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
        setDocumentDate(extData?.documentDate ?? "");
        setDateNeedsReview(extData?.dateNeedsReview === true);
        // Start on the first value that needs checking, so the paper lights up at once.
        const first = extData?.fields.find((f) => f.needsReview) ?? extData?.fields[0];
        setActiveKey(first?.key ?? null);
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
    const needsReviewCount =
      fields.filter((f) => f.needsReview).length + (dateNeedsReview ? 1 : 0);
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
        body: JSON.stringify({
          fields,
          documentDate: documentDate || null,
          dateChecked: !dateNeedsReview,
        }),
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

  const total = fields.length + 1;
  const needsReviewCount =
    fields.filter((f) => f.needsReview).length + (dateNeedsReview ? 1 : 0);
  const done = total - needsReviewCount;
  const n = (v: number) => toLocaleDigits(String(v), locale);
  const writtenDate = parseNumericDate(extraction.documentDateRaw);
  // Either reading of a date like 03/11/2026, whichever isn't selected right now.
  const otherDate = !writtenDate?.alternate
    ? null
    : documentDate === writtenDate.alternate
      ? writtenDate.date
      : writtenDate.alternate;
  const activeField = fields.find((f) => f.key === activeKey) ?? null;
  const canHighlight = doc.mimeType !== "application/pdf" && !imgFailed;

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
        <section aria-label={dict.review.original} className="sticky top-16 z-20 overflow-hidden rounded-2xl border bg-muted md:top-20">
          <OriginalDocument
            doc={doc}
            dict={dict}
            failed={imgFailed}
            onFail={() => setImgFailed(true)}
            box={activeField?.box}
          />
          {canHighlight && activeField && (
            <p aria-live="polite" className="border-t bg-card px-3 py-2 text-sm">
              <span className="font-medium">{fieldLabel(activeField, fields, dict, locale)}: </span>
              <span className="text-muted-foreground">
                {activeField.box ? dict.review.onPaper : dict.review.notOnPaper}
              </span>
            </p>
          )}
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
          {canHighlight && (
            <p className="text-sm font-medium text-warning-foreground">{dict.review.tapHint}</p>
          )}

          <div
            className={cn(
              "rounded-2xl border bg-card p-4",
              dateNeedsReview && !isConfirmed && "border-warning"
            )}
          >
            <label htmlFor="document-date" className="font-medium">{dict.review.dateLabel}</label>
            <input
              id="document-date"
              type="date"
              value={documentDate}
              max={new Date().toLocaleDateString("en-CA")}
              onChange={(e) => {
                setDocumentDate(e.target.value);
                setDateNeedsReview(false);
              }}
              disabled={isConfirmed}
              className="mt-2 h-12 w-full rounded-xl border bg-background px-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-70"
            />
            {documentDate && (
              <p className="mt-1 font-medium">{formatDate(documentDate, locale)}</p>
            )}
            {extraction.documentDateRaw && (
              <p className="mt-1 text-sm text-muted-foreground">
                {dict.review.dateWritten.replace("{{raw}}", toLocaleDigits(extraction.documentDateRaw, locale))}
              </p>
            )}
            {!isConfirmed && dateNeedsReview && (
              <p className="mt-2 text-sm font-medium text-warning-foreground">
                {!documentDate
                  ? dict.review.dateMissing
                  : otherDate
                    ? dict.review.dateAmbiguous
                        .replace("{{date}}", formatDate(documentDate, locale))
                        .replace("{{other}}", formatDate(otherDate, locale))
                    : dict.review.dateUnclear}
              </p>
            )}
            {!isConfirmed && otherDate && (
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-11 w-full"
                onClick={() => {
                  setDocumentDate(otherDate);
                  setDateNeedsReview(false);
                }}
              >
                {dict.review.dateUseOther.replace("{{date}}", formatDate(otherDate, locale))}
              </Button>
            )}
            {!isConfirmed && (
              <div className="mt-3">
                {dateNeedsReview ? (
                  <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setDateNeedsReview(false)}>
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
          </div>

          <ul className="flex flex-col gap-3">
            {fields.map((f) => {
              const label = fieldLabel(f, fields, dict, locale);
              const inputId = `field-${f.key}`;
              const differs =
                f.agreement === "mismatch" &&
                normalizeDigits(f.sources.muse ?? "") !== normalizeDigits(f.sources.ocr ?? "");
              return (
                <li
                  key={f.key}
                  onClick={() => setActiveKey(f.key)}
                  onFocus={() => setActiveKey(f.key)}
                  className={cn(
                    "cursor-pointer rounded-2xl border bg-card p-4",
                    f.needsReview && !isConfirmed && (f.agreement === "mismatch" ? "border-warning" : "border-primary/30"),
                    f.key === activeKey && "ring-2 ring-warning"
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
