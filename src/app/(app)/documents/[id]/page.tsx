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
      // Patch extraction with edited fields.
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
        <h1 className="text-2xl font-bold">{dict.review.title}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/documents")}
            disabled={saving || isConfirmed}
          >
            {dict.common.back}
          </Button>
          {!isConfirmed && (
            <Button
              onClick={handleConfirm}
              disabled={saving || needsReviewCount > 0}
              className="min-h-[44px]"
            >
              {saving ? dict.common.loading : dict.review.confirm}
            </Button>
          )}
          {isConfirmed && (
            <span className="text-xs font-semibold text-muted-foreground">
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
        <CardHeader>
          <CardTitle>{doc.fileName}</CardTitle>
          <CardDescription>
            {dict.documents.status[
              doc.status as keyof typeof dict.documents.status
            ] ?? doc.status}
            {needsReviewCount > 0 ? ` · ${needsReviewCount} ${dict.review.needsReview}` : ""}
            {mismatchCount > 0 ? ` · ${mismatchCount} ${dict.review.mismatch}` : ""}
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
                    <p className="text-sm">{dict.review.noPreview}</p>
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
                          <Input
                            value={f.rawValue}
                            onChange={(e) =>
                              handleChange(f.key, e.target.value)
                            }
                            className="text-sm bg-transparent border-0 focus:ring-0 h-auto min-h-[44px] py-1"
                            disabled={isConfirmed}
                          />
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {f.referenceRangeRaw ?? "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              f.agreement === "match"
                                ? "default"
                                : f.agreement === "mismatch"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {dict.review.agreement[f.agreement]}
                          </Badge>
                          {f.userEdited && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {dict.review.edited}
                            </Badge>
                          )}
                          {!isConfirmed && f.needsReview && (
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => handleToggleReview(f.key)}
                              className="ml-2"
                              aria-label={dict.review.checkThis}
                            />
                          )}
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
                    <p className="text-sm">{dict.review.noPreview}</p>
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
                          <Badge variant={f.agreement === "match" ? "default" : "destructive"}>
                            {dict.review.agreement[f.agreement]}
                          </Badge>
                          {!isConfirmed && f.needsReview && (
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => handleToggleReview(f.key)}
                              className="ml-2"
                              aria-label={dict.review.checkThis}
                            />
                          )}
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
