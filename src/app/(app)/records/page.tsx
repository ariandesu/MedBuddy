"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDictionary } from "@/lib/use-dictionary";
import {
  FileText,
  Image,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Upload,
  Activity,
  Moon,
  GlassWater,
} from "lucide-react";
import { UploadZone } from "@/components/upload-zone";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
};

type WellnessEntry = {
  id?: string;
  date: string;
  sleepHours?: number;
  waterGlasses?: number;
  activityMinutes?: number;
  energy?: number;
  symptomLevel?: string;
  symptoms?: string[];
};

type MedicalRecord = {
  id: string;
  documentId: string;
  recordType: string;
  recordDate: string | null;
  observations: Array<{
    name: string;
    rawValue: string;
    numericValue?: number | null;
    unit?: string | null;
    referenceRangeRaw?: string | null;
  }>;
  medications: Array<{
    nameAsWritten: string;
    doseAsWritten: string;
    frequencyAsWritten: string;
    durationAsWritten: string;
    uncertain?: boolean;
  }>;
};

type TimelineEntry =
  | { type: "record"; id: string; record: MedicalRecord; date: string }
  | { type: "wellness"; id: string; wellness: WellnessEntry; date: string };

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

const RECORD_TYPE_CONFIG: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  lab_report: { label: "lab_report", Icon: FileText, color: "bg-blue-50 text-blue-600" },
  prescription: { label: "prescription", Icon: Activity, color: "bg-green-50 text-green-600" },
  other: { label: "other", Icon: FileText, color: "bg-gray-50 text-gray-600" },
};

function getRecordTypeLabel(dict: Record<string, unknown>, recordType: string): string {
  const rt = dict.recordType as Record<string, string> | undefined;
  return rt?.[recordType] ?? recordType;
}

function renderRecordIcon(recordType: string): React.ReactNode {
  const config = RECORD_TYPE_CONFIG[recordType] ?? RECORD_TYPE_CONFIG.other;
  return (
    <>
      <config.Icon className="size-4" aria-hidden />
      <span className="font-medium text-sm">{config.label}</span>
    </>
  );
}

function TimelineEntryItem({
  e,
  dict,
}: {
  e: TimelineEntry;
  dict: ReturnType<typeof useDictionary>;
}) {
  if (e.type === "record") {
    const rec = e.record;
    return (
      <li key={e.id} className="border-b pb-3 last:border-0" id={`rec-${e.id}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {renderRecordIcon(rec.recordType)}
          </div>
          <span className="text-xs text-muted-foreground">
            {rec.recordDate ?? (dict.report as Record<string, string>).noRange}
          </span>
          <Link
            href={`/documents/${rec.documentId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {(dict.records as Record<string, string>).viewDocument}
          </Link>
        </div>
        {rec.observations.length > 0 && (
          <ul className="text-xs text-muted-foreground mt-2">
            {rec.observations.map((o) => (
              <li key={o.name} className="flex items-center gap-1">
                <FileText className="size-2 text-muted-foreground" aria-hidden />
                {o.name}: {o.rawValue}{o.unit ? ` ${o.unit}` : ""}
              </li>
            ))}
          </ul>
        )}
        {rec.medications.length > 0 && (
          <ul className="text-xs text-muted-foreground mt-2 list-disc ml-4">
            {rec.medications.map((m) => (
              <li key={m.nameAsWritten}>
                {m.nameAsWritten} — {m.doseAsWritten}, {m.frequencyAsWritten}, {m.durationAsWritten}
                {m.uncertain ? " (" + ((dict.report as Record<string, string>).uncertain ?? "uncertain") + ")" : ""}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  const w = e.wellness;
  return (
    <li key={e.id} className="border-b pb-3 last:border-0" id={`rec-${e.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" aria-hidden />
          <span className="font-medium text-sm">{dict.timeline.checkin}</span>
        </div>
        <span className="text-xs text-muted-foreground">{w.date}</span>
      </div>
      <ul className="text-xs text-muted-foreground mt-2">
        {w.sleepHours != null && (
          <li className="flex items-center gap-1">
            <Moon className="size-3" aria-hidden />
            {(dict.chart as Record<string, string>).sleep}: {w.sleepHours} hrs
          </li>
        )}
        {w.waterGlasses != null && (
          <li className="flex items-center gap-1">
            <GlassWater className="size-3" aria-hidden />
            {(dict.chart as Record<string, string>).water}: {w.waterGlasses}
          </li>
        )}
        {w.activityMinutes != null && (
          <li className="flex items-center gap-1">
            <Activity className="size-3" aria-hidden />
            {(dict.chart as Record<string, string>).activity}: {w.activityMinutes} min
          </li>
        )}
      </ul>
    </li>
  );
}

export default function RecordsPage() {
  const dict = useDictionary();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [wellness, setWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"documents" | "timeline">("documents");

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents ?? []);
      }
    } catch {
      setDocs([]);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      const [rRes, wRes] = await Promise.all([
        fetch("/api/medical-records"),
        fetch("/api/wellness"),
      ]);
      if (rRes.ok) {
        const data = await rRes.json();
        setRecords(data.records ?? []);
      }
      if (wRes.ok) {
        const data = await wRes.json();
        setWellness(data.entries ?? []);
      }
    } catch {
      setRecords([]);
      setWellness([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecords();
  }, [loadDocs, loadRecords]);

  const tabLabel = (key: string) => (dict.records as Record<string, string>)[key];

  const merged: TimelineEntry[] = [
    ...records.map((r) => ({
      type: "record" as const,
      id: r.id,
      record: r,
      date: r.recordDate ?? "",
    })),
    ...wellness.map((w) => ({
      type: "wellness" as const,
      id: w.id ?? `well-${w.date}`,
      wellness: w,
      date: w.date,
    })),
  ].sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-primary" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold">{dict.records.title}</h1>
            <p className="text-sm text-muted-foreground">{dict.records.subtitle}</p>
          </div>
        </div>
        <Link
          href="/documents"
          className={buttonVariants({ variant: "outline", size: "sm", className: "min-h-[48px] px-4" })}
        >
          <Upload className="size-4 mr-2" aria-hidden />
          {dict.documents.upload}
        </Link>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="documents" className="min-h-[48px]">
            <FileText className="size-4 mr-2" aria-hidden />
            {tabLabel("documents")}
          </TabsTrigger>
          <TabsTrigger value="timeline" className="min-h-[48px]">
            <Activity className="size-4 mr-2" aria-hidden />
            {tabLabel("timeline")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{dict.records.documents}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center">
                  {dict.common.loading}
                </div>
              ) : docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <FileText className="size-12 text-muted-foreground mb-3" aria-hidden />
                  <p className="text-sm text-muted-foreground">{dict.records.noDocuments}</p>
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
                            <Badge variant={status.badge} className="text-xs">
                              {dict.documents.status[status.labelKey as keyof typeof dict.documents.status] ?? d.status}
                            </Badge>
                          </div>
                          <Link href={`/documents/${d.id}`} className="line-clamp-1 font-medium hover:underline-offset-4">
                            {d.fileName}
                          </Link>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{d.mimeType.replace("image/", "").toUpperCase()}</span>
                            <span>{((d.sizeBytes || 0) / 1024).toFixed(0)} KB</span>
                          </div>
                        </CardContent>
                        <CardContent className="pt-2">
                          <div className="grid gap-2 grid-cols-2">
                            {d.status === "failed" ? (
                              <Button
                                onClick={() => {
                                  void fetch(`/api/documents/${d.id}/retry`, { method: "POST" }).then(() => loadDocs());
                                }}
                                variant="outline"
                                size="sm"
                                className="w-full min-h-[48px]"
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
                                  className: "w-full min-h-[48px] flex items-center justify-center",
                                })}
                              >
                                <AlertCircle className="size-3 mr-1" aria-hidden />
                                {tabLabel("reviewDocument")}
                              </Link>
                            ) : (
                              <Link
                                href={`/documents/${d.id}`}
                                className={buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                  className: "w-full min-h-[48px] flex items-center justify-center",
                                })}
                              >
                                <FileText className="size-3 mr-1" aria-hidden />
                                {tabLabel("viewDocument")}
                              </Link>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteDialog({ id: d.id, name: d.fileName })}
                              className="w-full min-h-[48px] flex items-center justify-center"
                            >
                              <Trash2 className="size-3 mr-1" aria-hidden />
                              {tabLabel("deleteDocument")}
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

          {deleteDialog && (
            <AlertDialog open={true} onOpenChange={(open) => {
              if (!open) setDeleteDialog(null);
            }}>
              <AlertDialogContent>
                <AlertDialogHeader>{tabLabel("deleteConfirm")}</AlertDialogHeader>
                <AlertDialogDescription>
                  {tabLabel("deleteConfirmDesc")}{" "}
                  <strong>{deleteDialog.name}</strong>?
                </AlertDialogDescription>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteDialog(null)}>
                    {dict.common.cancel}
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      const res = await fetch(`/api/documents/${deleteDialog.id}`, { method: "DELETE" });
                      if (res.ok) {
                        setDeleteDialog(null);
                        loadDocs();
                      }
                    }}
                  >
                    <Trash2 className="size-3 mr-1" aria-hidden />
                    {tabLabel("deleteDocument")}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{dict.records.timeline}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center">{dict.common.loading}</div>
              ) : merged.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <Activity className="size-12 text-muted-foreground mb-3" aria-hidden />
                  <p className="text-sm text-muted-foreground">{dict.records.noTimeline}</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {merged.map((e) => (
                    <TimelineEntryItem key={e.id} e={e} dict={dict} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
