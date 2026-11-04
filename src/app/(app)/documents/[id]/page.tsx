"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocale } from "@/components/locale-provider";
import { formatDate, normalizeDigits, toLocaleDigits } from "@/lib/digits";
import { parseNumericDate } from "@/lib/document-date";
import { cn } from "@/lib/utils";
import type { Dictionary, Locale } from "@/lib/i18n";
import { PageTitle } from "@/components/page-title";
import { StickyActionBar } from "@/components/sticky-action-bar";
import { OptionCard } from "@/components/option-card";
import { DeletePaperDialog } from "@/components/delete-paper-dialog";
import { PaperView } from "@/components/paper-view";
import { RecordDetail } from "@/components/record-detail";

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

/** The paper's date is checked like any other value, under this key. */
const DATE_KEY = "__date";

const INPUT_CLASS =
  "h-14 w-full min-w-0 rounded-[1.125rem] border border-input bg-popover px-4 text-lg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-70";

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
  const [activeKey, setActiveKey] = useState<string>(DATE_KEY);
  const [showList, setShowList] = useState(false);
  const [typingKey, setTypingKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        setActiveKey(extData?.dateNeedsReview === true ? DATE_KEY : (first?.key ?? DATE_KEY));
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

  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <PageTitle title={dict.review.title} back={{ href: "/records", label: `${dict.common.back}: ${dict.nav.records}` }} />
        <Skeleton className="h-60 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }
  // A saved paper is no longer being checked: it has its own page.
  if (doc?.status === "confirmed") return <RecordDetail doc={doc} />;
  if (!doc || !extraction) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        <PageTitle title={dict.review.title} back={{ href: "/records", label: `${dict.common.back}: ${dict.nav.records}` }} />
        <p role="alert" className="rounded-2xl border bg-card-lead p-4">{dict.review.loadFailed}</p>
      </div>
    );
  }

  const n = (v: number) => toLocaleDigits(String(v), locale);
  const pendingKeys = [
    ...(dateNeedsReview ? [DATE_KEY] : []),
    ...fields.filter((f) => f.needsReview).map((f) => f.key),
  ];
  const allKeys = [DATE_KEY, ...fields.map((f) => f.key)];
  const total = allKeys.length;
  const done = total - pendingKeys.length;
  const activeIndex = Math.max(0, allKeys.indexOf(activeKey));
  const activeField = fields.find((f) => f.key === activeKey) ?? null;
  const activePending = pendingKeys.includes(activeKey);

  const writtenDate = parseNumericDate(extraction.documentDateRaw);
  // Either reading of a date like 03/11/2026, whichever isn't selected right now.
  const otherDate = !writtenDate?.alternate
    ? null
    : documentDate === writtenDate.alternate
      ? writtenDate.date
      : writtenDate.alternate;

  /** The next value still to check after this one, wrapping round. */
  const nextPending = (without: string) => {
    const rest = pendingKeys.filter((k) => k !== without);
    return rest.find((k) => allKeys.indexOf(k) > allKeys.indexOf(without)) ?? rest[0] ?? null;
  };

  const primaryAction = () => {
    if (activePending) {
      if (activeKey === DATE_KEY) setDateNeedsReview(false);
      else setFields((prev) => prev.map((f) => (f.key === activeKey ? { ...f, needsReview: false } : f)));
      const following = nextPending(activeKey);
      if (following) setActiveKey(following);
    } else if (pendingKeys.length > 0) {
      setActiveKey(pendingKeys[0]);
    } else {
      void handleConfirm();
    }
  };

  const primaryLabel = activePending
    ? pendingKeys.length > 1
      ? dict.review.lookRightNext
      : dict.review.markChecked
    : pendingKeys.length > 0
      ? dict.review.next
      : saving
        ? dict.common.loading
        : dict.review.confirmCta;

  const readingBadge = (f: Field) => {
    if (f.agreement === "match") return <Badge variant="secondary">{dict.review.agreement.match}</Badge>;
    if (f.agreement === "mismatch") return <Badge variant="warning">{dict.review.agreement.mismatch}</Badge>;
    return <Badge variant="warning">{f.sources.muse ? dict.review.onlyAi : dict.review.onlyPhone}</Badge>;
  };

  const editor = activeField ? (() => {
    const f = activeField;
    const differs =
      f.agreement === "mismatch" &&
      normalizeDigits(f.sources.muse ?? "") !== normalizeDigits(f.sources.ocr ?? "");
    const choices = differs ? (["muse", "ocr"] as const).filter((src) => f.sources[src]) : [];
    const offChoices = differs && !choices.some((src) => f.sources[src] === f.rawValue);
    const showInput = !differs || typingKey === f.key || offChoices;
    return (
      <>
        <div className="flex flex-col items-start gap-1">
          <h2 className="font-heading text-xl font-semibold">{fieldLabel(f, fields, dict, locale)}</h2>
          {readingBadge(f)}
        </div>
        {differs && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium">{dict.review.whichMatches}</legend>
            {choices.map((src) => (
              <OptionCard
                key={src}
                label={f.sources[src] ?? ""}
                description={src === "muse" ? dict.review.readingAi : dict.review.readingOcr}
                active={f.rawValue === f.sources[src]}
                onToggle={() => {
                  setTypingKey(null);
                  handleChange(f.key, f.sources[src] ?? "");
                }}
              />
            ))}
            {!showInput && (
              <button
                type="button"
                onClick={() => setTypingKey(f.key)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-full font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Pencil className="size-4" aria-hidden />
                {dict.review.neither}
              </button>
            )}
          </fieldset>
        )}
        {showInput && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="value-input" className="font-medium">{dict.review.matchQuestion}</label>
            <div className="flex items-center gap-2">
              <input
                id="value-input"
                value={f.rawValue}
                placeholder={dict.review.empty}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className={INPUT_CLASS}
              />
              {f.unit && <span className="shrink-0 text-muted-foreground">{f.unit}</span>}
              {f.userEdited && <Pencil className="size-4 shrink-0 text-muted-foreground" aria-label={dict.review.edited} />}
            </div>
          </div>
        )}
        {f.referenceRangeRaw && (
          <p className="text-sm text-muted-foreground">
            {dict.review.colRefRange}: {toLocaleDigits(f.referenceRangeRaw, locale)}
          </p>
        )}
        {MED_FIELD.test(f.key) && <p className="text-sm text-muted-foreground">{dict.review.keepWritten}</p>}
      </>
    );
  })() : (
    <>
      <h2 className="font-heading text-xl font-semibold">{dict.review.dateLabel}</h2>
      <input
        id="value-input"
        aria-label={dict.review.dateLabel}
        type="date"
        value={documentDate}
        max={new Date().toLocaleDateString("en-CA")}
        onChange={(e) => {
          setDocumentDate(e.target.value);
          setDateNeedsReview(false);
        }}
        className={INPUT_CLASS}
      />
      {documentDate && <p className="font-medium">{formatDate(documentDate, locale)}</p>}
      {extraction.documentDateRaw && (
        <p className="text-sm text-muted-foreground">
          {dict.review.dateWritten.replace("{{raw}}", toLocaleDigits(extraction.documentDateRaw, locale))}
        </p>
      )}
      {dateNeedsReview && (
        <p className="text-sm font-medium text-warning-foreground">
          {!documentDate
            ? dict.review.dateMissing
            : otherDate
              ? dict.review.dateAmbiguous
                  .replace("{{date}}", formatDate(documentDate, locale))
                  .replace("{{other}}", formatDate(otherDate, locale))
              : dict.review.dateUnclear}
        </p>
      )}
      {otherDate && (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full"
          onClick={() => {
            setDocumentDate(otherDate);
            setDateNeedsReview(false);
          }}
        >
          {dict.review.dateUseOther.replace("{{date}}", formatDate(otherDate, locale))}
        </Button>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3 pb-4 md:pb-0">
      <PageTitle
        title={dict.review.title}
        subtitle={doc.fileName}
        back={{ href: "/records", label: `${dict.common.back}: ${dict.nav.records}` }}
      />

              <div className="flex flex-col gap-2">
          <p aria-live="polite" className="font-medium">
            {dict.review.valueOf.replace("{{n}}", n(activeIndex + 1)).replace("{{total}}", n(total))}
          </p>
          <Progress
            value={(done / total) * 100}
            aria-label={dict.review.progress.replace("{{done}}", n(done)).replace("{{total}}", n(total))}
          />
        </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-start md:gap-6">
        <PaperView
          doc={doc}
          dict={dict}
          box={activeField?.box}
          caption={activeField && (activeField.box ? dict.review.onPaper : dict.review.notOnPaper)}
          className="md:sticky md:top-20"
        />

        <div className="flex flex-col gap-3">
          <section className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">{editor}</section>
                      <StickyActionBar>
              <Button onClick={primaryAction} disabled={saving} className="h-14 w-full text-lg font-semibold">
                <Check className="size-5!" aria-hidden />
                {primaryLabel}
              </Button>
              {pendingKeys.length > 0 && (
                <p className="mt-1 text-center text-sm text-muted-foreground">{dict.review.confirmHint}</p>
              )}
            </StickyActionBar>

                      <button
              type="button"
              aria-expanded={showList}
              onClick={() => setShowList((v) => !v)}
              className="flex min-h-12 items-center justify-center rounded-full font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            >
              {showList ? dict.review.hideAll : dict.review.seeAll}
            </button>

          <ul className={cn("flex-col gap-2", showList ? "flex" : "hidden md:flex")}>
            {allKeys.map((key) => {
              const f = fields.find((x) => x.key === key);
              const pending = pendingKeys.includes(key);
              const value = f
                ? f.rawValue
                : documentDate
                  ? formatDate(documentDate, locale)
                  : "";
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-current={key === activeKey ? "true" : undefined}
                    onClick={() => setActiveKey(key)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-[1.25rem] border px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      key === activeKey ? "border-primary bg-card-lead" : "bg-card hover:bg-card-lead"
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-muted-foreground">
                        {f ? fieldLabel(f, fields, dict, locale) : dict.review.dateLabel}
                      </span>
                      <span className="block break-words font-medium">{value || dict.review.empty}</span>
                    </span>
                                          <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                          pending ? "border-chart-4" : "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {!pending && <Check className="size-4" aria-hidden />}
                        <span className="sr-only">{pending ? dict.review.needsReview : dict.review.checked}</span>
                      </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setDeleting(true)}
            className="flex min-h-12 items-center justify-center font-medium text-destructive-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {dict.review.deletePaper}
          </button>
        </div>
      </div>

      {deleting && (
        <DeletePaperDialog
          doc={doc}
          dict={dict}
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/records")}
        />
      )}
    </div>
  );
}
