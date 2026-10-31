"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/upload-zone";
import { useDictionary } from "@/lib/use-dictionary";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Image,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Upload,
} from "lucide-react";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
};

const ICON_BY_TYPE: Record<string, React.ElementType> = {
  "image/jpeg": Image,
  "image/png": Image,
  "application/pdf": FileText,
};

const STATUS_CONFIG: Record<
  string,
  { labelKey: string; badge: "default" | "secondary" | "destructive"; Icon: React.ElementType }
> = {
  uploaded: { labelKey: "uploaded", badge: "default", Icon: Clock },
  processing: { labelKey: "processing", badge: "default", Icon: Clock },
  needs_review: { labelKey: "needs_review", badge: "secondary", Icon: AlertCircle },
  confirmed: { labelKey: "confirmed", badge: "default", Icon: CheckCircle2 },
  failed: { labelKey: "failed", badge: "destructive", Icon: AlertCircle },
};

export function DocumentsView({ embedded = false }: { embedded?: boolean }) {
  const dict = useDictionary();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const serverDocs: Doc[] = [];
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        serverDocs.push(...(data.documents ?? []));
      }
    } catch {
      // Server unreachable — show empty state.
    }
    setDocs(serverDocs);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/documents")
      .then(res => (res.ok ? res.json() : { documents: [] }))
      .then(data => {
        if (!cancelled) {
          setDocs(data.documents ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDocs([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="flex flex-col gap-6">
        {!embedded && (
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" aria-hidden />
            <h1 className="text-2xl font-bold">{dict.documents.title}</h1>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="size-4 text-primary" aria-hidden />
              <CardTitle>{dict.documents.upload}</CardTitle>
            </div>
            <CardDescription>{dict.documents.help}</CardDescription>
          </CardHeader>
          <CardContent>
            <UploadZone dict={dict} onUploadComplete={() => load()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.documents.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                {dict.common.loading}
              </div>
            ) : docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <FileText className="size-12 text-muted-foreground mb-3" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {dict.documents.empty}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map((d) => {
                  const DocIcon = ICON_BY_TYPE[d.mimeType] ?? FileText;
                  const status = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.uploaded;
                  return (
                    <Card key={d.id} className="flex flex-col h-full group">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <DocIcon className="size-4 text-muted-foreground" aria-hidden />
                          <Badge variant={status.badge} className="text-sm">
                            {dict.documents.status[status.labelKey as keyof typeof dict.documents.status] ?? d.status}
                          </Badge>
                        </div>
                        <Link href={`/documents/${d.id}`} className="line-clamp-1 font-medium hover:underline-offset-4">
                          {d.fileName}
                        </Link>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{d.mimeType.replace("image/", "").toUpperCase()}</span>
                          <span>{((d.sizeBytes || 0) / 1024).toFixed(0)} KB</span>
                        </div>
                      </CardContent>
                      <CardContent className="pt-2">
                        <div className="grid gap-2 grid-cols-2">
                          {d.status === "failed" ? (
                            <Button
                              onClick={() => {
                                void fetch(`/api/documents/${d.id}/retry`, {
                                  method: "POST",
                                }).then(() => load());
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full min-h-[40px]"
                            >
                              <RefreshCw className="size-3 mr-1" aria-hidden />
                              {dict.documents.retry}
                            </Button>
                          ) : d.status === "needs_review" ? (
                            <Link
                              href={`/documents/${d.id}`}
                              className={buttonVariants({
                                variant: "secondary",
                                size: "sm",
                                className: "w-full min-h-[40px] flex items-center justify-center",
                              })}
                            >
                              <AlertCircle className="size-3 mr-1" aria-hidden />
                              {dict.documents.review}
                            </Link>
                          ) : (
                            <Link
                              href={`/documents/${d.id}`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                                className: "w-full min-h-[40px] flex items-center justify-center",
                              })}
                            >
                              <FileText className="size-3 mr-1" aria-hidden />
                              {dict.documents.view}
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteDialog({ id: d.id, name: d.fileName })}
                            className="w-full min-h-[40px] flex items-center justify-center"
                          >
                            <Trash2 className="size-3 mr-1" aria-hidden />
                            {dict.documents.delete}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {deleteDialog && (
        <AlertDialog open={true} onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>{dict.documents.deleteConfirm}</AlertDialogHeader>
            <AlertDialogDescription>
              {dict.documents.deleteConfirmDesc}{" "}
              <strong>{deleteDialog.name}</strong>?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialog(null)}>
                {dict.common.cancel}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={async () => {
                  const res = await fetch(`/api/documents/${deleteDialog.id}`, {
                    method: "DELETE",
                  });
                  if (res.ok) {
                    setDeleteDialog(null);
                    load();
                  }
                }}
              >
                <Trash2 className="size-3 mr-1" aria-hidden />
                {dict.documents.delete}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
