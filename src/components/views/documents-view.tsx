"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, RefreshCw, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tile } from "@/components/tile";
import { LoadError } from "@/components/load-error";
import { DeletePaperDialog } from "@/components/delete-paper-dialog";
import { useLocale } from "@/components/locale-provider";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import { recordTitle } from "@/lib/record-title";
import { cn } from "@/lib/utils";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
};

type SavedRecord = { documentId: string; recordType: string; recordDate: string | null };

async function fetchPapers(): Promise<{ docs: Doc[]; records: SavedRecord[]; failed: boolean }> {
  try {
    const [docRes, recRes] = await Promise.all([fetch("/api/documents"), fetch("/api/medical-records")]);
    if (!docRes.ok || !recRes.ok) throw new Error();
    const [docData, recData] = await Promise.all([docRes.json(), recRes.json()]);
    return { docs: docData.documents ?? [], records: recData.records ?? [], failed: false };
  } catch {
    return { docs: [], records: [], failed: true };
  }
}

export function DocumentsView() {
  const { dict, locale } = useLocale();
  const router = useRouter();
  const t = dict.documents;
  const [docs, setDocs] = useState<Doc[]>([]);
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [deleting, setDeleting] = useState<Doc | null>(null);

  const load = useCallback(async () => {
    const data = await fetchPapers();
    setDocs(data.docs);
    setRecords(data.records);
    setFailed(data.failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchPapers().then((data) => {
      if (cancelled) return;
      setDocs(data.docs);
      setRecords(data.records);
      setFailed(data.failed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (failed) return <LoadError />;

  const toCheck = docs.filter((d) => d.status === "needs_review");
  const saved = docs.filter((d) => d.status === "confirmed");
  const unfinished = docs.filter((d) => d.status !== "needs_review" && d.status !== "confirmed");

  // A saved paper is named by what it is and when; the file name comes second.
  const savedTitle = (d: Doc) => {
    const rec = records.find((r) => r.documentId === d.id);
    return rec ? recordTitle(rec, dict, locale) : d.fileName;
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {docs.length === 0 && (
          <section className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
            <p className="font-heading text-xl font-semibold">{t.empty}</p>
            <Link href="/records?add=1" className={cn(buttonVariants(), "h-14 w-full text-lg font-semibold")}>
              {t.addPaper}
            </Link>
          </section>
        )}

        {toCheck.length > 0 && (
          <section aria-labelledby="to-check-h" className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 id="to-check-h" className="font-heading text-lg font-semibold">{t.toCheck}</h2>
              <Badge variant="warning">{toLocaleDigits(String(toCheck.length), locale)}</Badge>
            </div>
            {toCheck.map((d) => (
              <div key={d.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Tile><FileText className="size-5" /></Tile>
                  <div className="min-w-0">
                    <p className="break-words font-medium">{d.fileName}</p>
                    <p className="text-sm text-muted-foreground">{t.addedOn.replace("{{date}}", formatDate(d.createdAt, locale))}</p>
                  </div>
                </div>
                <Link href={`/documents/${d.id}`} className={cn(buttonVariants(), "h-14 w-full text-lg font-semibold")}>
                  {t.checkThis}
                </Link>
              </div>
            ))}
          </section>
        )}

        {unfinished.length > 0 && (
          <ul className="flex flex-col gap-3">
            {unfinished.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 break-words font-medium">{d.fileName}</p>
                  <Badge variant={d.status === "failed" ? "warning" : "secondary"}>
                    {t.status[d.status as keyof typeof t.status] ?? d.status}
                  </Badge>
                </div>
                {d.status === "failed" && <p className="text-sm text-muted-foreground">{t.aiFailed}</p>}
                <div className="flex gap-2">
                  {d.status === "failed" && (
                    <Button
                      className="h-12 flex-1"
                      onClick={() => {
                        void fetch(`/api/documents/${d.id}/retry`, { method: "POST" }).then(() => load());
                      }}
                    >
                      <RefreshCw aria-hidden />
                      {t.retry}
                    </Button>
                  )}
                  <Button variant="destructive-soft" className="h-12 flex-1" onClick={() => setDeleting(d)}>
                    <Trash2 aria-hidden />
                    {t.delete}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {saved.length > 0 && (
          <section aria-labelledby="saved-h">
            <h2 id="saved-h" className="mb-2 font-heading text-lg font-semibold">{t.saved}</h2>
            <ul className="divide-y rounded-2xl border bg-card px-4">
              {saved.map((d) => (
                <li key={d.id}>
                  <Link href={`/documents/${d.id}`} className="flex min-h-[4.25rem] items-center gap-3 py-2">
                    <Tile><FileText className="size-5" /></Tile>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{savedTitle(d)}</span>
                      <span className="block truncate text-sm text-muted-foreground">{d.fileName}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {deleting && (
        <DeletePaperDialog
          doc={deleting}
          dict={dict}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            void load();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
