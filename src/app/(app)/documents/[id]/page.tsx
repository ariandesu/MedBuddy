"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useDictionary } from "@/lib/use-dictionary";
import { normalizeDigits } from "@/lib/digits";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowLeft,
  Check,
  Image,
  RefreshCw,
  Eye,
  Pencil,
} from "lucide-react";

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

type AgreementCellProps = {
  field: Field;
  isConfirmed: boolean;
  dict: ReturnType<typeof useDictionary>;
  onToggleReview: (key: string) => void;
};

function AgreementCell({
  field,
  isConfirmed,
  dict,
  onToggleReview,
}: AgreementCellProps) {
  const config =
    AGREEMENT_CONFIG[field.agreement] ?? AGREEMENT_CONFIG.single_source;
  return (
    <>
      <Badge variant={config.badge} className="text-xs">
        {config.labelKey}
      </Badge>
      {field.userEdited && (
        <Badge variant="outline" className="ml-1 text-xs">
          {dict.review.edited}
        </Badge>
      )}
      {!isConfirmed && field.needsReview && (
        <Checkbox
          checked={false}
          onCheckedChange={() => onToggleReview(field.key)}
          className="ml-2 mt-1"
          aria-label={dict.review.checkThis}
        />
      )}
    </>
  );
}

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

const AGREEMENT_CONFIG: Record<
  string,
  { labelKey: string; badge: "default" | "destructive" | "secondary"; Icon: React.ElementType }
> = {
  match: { labelKey: "match", badge: "default", Icon: CheckCircle2 },
  mismatch: { labelKey: "mismatch", badge: "destructive", Icon: AlertTriangle },
  single_source: { labelKey: "single_source", badge: "secondary", Icon: Info },
};

export default function DocumentReviewPage() {
  const dict = useDictionary();
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
      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  };

  const isConfirmed = doc?.status === "confirmed";

  if (loading) return <div className="h-60 flex items-center justify-center">{dict.common.loading}</div>;
  if (!doc || !extraction)
    return <div className="h-60 flex items-center justify-center">{dict.common.error}</div>;

  const mismatchCount = fields.filter((f) => f.agreement === "mismatch").length;
  const needsReviewCount = fields.filter((f) => f.needsReview).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ArrowLeft className="size-5 text-primary" aria-hidden />
          <h1 className="text-2xl font-bold">{dict.review.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/documents")}
            disabled={saving || isConfirmed}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {dict.common.back}
          </Button>
          {!isConfirmed && (
            <Button
              onClick={handleConfirm}
              disabled={saving || needsReviewCount > 0}
              className="min-h-[44px] flex items-center gap-2"
            >
              <Check className="size-4" aria-hidden />
              {saving ? dict.common.loading : dict.review.confirm}
            </Button>
          )}
          {isConfirmed && (
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-4 text-green-600" aria-hidden />
              {dict.review.alreadyConfirmed}
            </span>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" aria-hidden />
            <CardTitle>{doc.fileName}</CardTitle>
          </div>
          <CardDescription className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2">
            <span className="text-xs font-medium">
              {dict.documents.status[
                doc.status as keyof typeof dict.documents.status
              ] ?? doc.status}
            </span>
            {needsReviewCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="size-3" aria-hidden />
                {needsReviewCount} {dict.review.needsReview}
              </span>
            )}
            {mismatchCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="size-3" aria-hidden />
                {mismatchCount} {dict.review.mismatch}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:flex gap-6">
            {/* Original — left */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-muted/50">
              {doc.mimeType === "application/pdf" || imgFailed ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                  {doc.mimeType === "application/pdf" ? (
                    <>
                      <FileText className="size-8 text-muted-foreground mb-2" aria-hidden />
                      <a
                        href={`/api/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline"
                      >
                        {dict.review.openPdf}
                      </a>
                      <p className="text-xs mt-2">{dict.review.noPreview}</p>
                    </>
                  ) : (
                    <>
                      <Image className="size-8 text-muted-foreground mb-2" aria-hidden />
                      <p className="text-sm">{dict.review.noPreview}</p>
                    </>
                  )}
                </div>
              ) : (
                <img
                  src={`/api/documents/${doc.id}/file`}
                  alt={dict.review.originalDocumentAlt}
                  className="w-full h-auto block max-h-[60vh] object-contain mx-auto"
                  onError={() => setImgFailed(true)}
                />
              )}
            </div>
            {/* Extracted — right */}
            <div className="flex-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.review.colField}</TableHead>
                      <TableHead>{dict.review.colValue}</TableHead>
                      <TableHead className="text-center">{dict.review.colRefRange}</TableHead>
                      <TableHead className="text-center">{dict.review.colAgreement}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((f) => (
                      <TableRow key={f.key}>
                        <TableCell className="font-medium text-sm">
                          {f.label}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              value={f.rawValue}
                              onChange={(e) =>
                                handleChange(f.key, e.target.value)
                              }
                              className="text-sm bg-transparent border-0 focus:ring-0 h-auto min-h-[44px] py-1 flex-1"
                              disabled={isConfirmed}
                            />
                            {f.userEdited && (
                              <Pencil className="size-3 text-muted-foreground" aria-hidden />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {f.referenceRangeRaw ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <AgreementCell
                            field={f}
                            isConfirmed={isConfirmed}
                            dict={dict}
                            onToggleReview={handleToggleReview}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Mobile: stacked tabs */}
          <Tabs defaultValue="extracted" className="md:hidden mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="original">{dict.review.original}</TabsTrigger>
              <TabsTrigger value="extracted">{dict.review.extracted}</TabsTrigger>
            </TabsList>
            <TabsContent value="original" className="border border-border rounded-lg p-3 bg-muted/50">
              {doc.mimeType === "application/pdf" || imgFailed ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
                  {doc.mimeType === "application/pdf" ? (
                    <>
                      <FileText className="size-8 text-muted-foreground mb-2" aria-hidden />
                      <a
                        href={`/api/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline"
                      >
                        {dict.review.openPdf}
                      </a>
                      <p className="text-xs mt-2">{dict.review.noPreview}</p>
                    </>
                  ) : (
                    <>
                      <Image className="size-8 text-muted-foreground mb-2" aria-hidden />
                      <p className="text-sm">{dict.review.noPreview}</p>
                    </>
                  )}
                </div>
              ) : (
                <img
                  src={`/api/documents/${doc.id}/file`}
                  alt={dict.review.originalDocumentAlt}
                  className="w-full h-auto block max-h-[50vh] object-contain mx-auto"
                  onError={() => setImgFailed(true)}
                />
              )}
            </TabsContent>
            <TabsContent value="extracted">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.review.colField}</TableHead>
                      <TableHead>{dict.review.colValue}</TableHead>
                      <TableHead className="text-center">{dict.review.colAgreement}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((f) => (
                      <TableRow key={f.key}>
                        <TableCell className="font-medium text-sm">
                          {f.label}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={f.rawValue}
                            onChange={(e) =>
                              handleChange(f.key, e.target.value)
                            }
                            className="text-sm bg-transparent border-0 focus:ring-0 h-auto min-h-[44px] py-1"
                            disabled={isConfirmed}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <AgreementCell
                            field={f}
                            isConfirmed={isConfirmed}
                            dict={dict}
                            onToggleReview={handleToggleReview}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
