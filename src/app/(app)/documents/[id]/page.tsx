"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useDictionary } from "@/lib/use-dictionary";

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

export default function DocumentReviewPage() {
  const dict = useDictionary();
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
  const id = typeof window !== "undefined" ? window.location.pathname.split("/").pop() : null;
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [dRes, eRes] = await Promise.all([
        fetch(`/api/documents/${id}`),
        fetch(`/api/extractions?documentId=${encodeURIComponent(id ?? "")}`),
      ]);
      if (dRes.ok) {
        const d = await dRes.json();
        if (!cancelled) setDoc(d);
      }
      if (eRes.ok) {
        const e = await eRes.json();
        if (!cancelled) {
          setExtraction(e);
          setFields(e.fields);
        }
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
          ? { ...f, rawValue: value, userEdited: true }
          : f
      )
    );
  };

  const handleConfirm = async () => {
    const extId = extraction?.id;
    if (!extId) {
      setError("No extraction found");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Persist edits first.
      const patchRes = await fetch(`/api/extractions/${extId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      if (!patchRes.ok) throw new Error("Failed to save edits");

      const confirmRes = await fetch(
        `/api/extractions/${extId}/confirm`,
        { method: "POST" }
      );
      if (!confirmRes.ok) throw new Error("Confirm failed");
      await confirmRes.json();
      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-60 flex items-center justify-center">Loading…</div>;
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
            onClick={() => router.push(`/documents/${doc.id}`)}
          >
            {dict.common.back}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="min-h-[44px]"
          >
            {saving ? dict.common.loading : dict.review.confirm}
          </Button>
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
            {dict.documents.status[doc.status as keyof typeof dict.documents.status] ?? doc.status}
            {needsReviewCount > 0 ? ` · ${needsReviewCount} ${dict.review.needsReview}` : ""}
            {mismatchCount > 0 ? ` · ${mismatchCount} ${dict.review.mismatch}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:flex gap-6">
            {/* Original — left */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-muted/50">
              <img
                src={`/api/documents/${doc.id}/file`}
                alt="Original document"
                className="w-full h-auto block max-h-[60vh] object-contain mx-auto"
              />
            </div>
            {/* Extracted — right */}
            <div className="flex-1">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Value (as written)</TableHead>
                      <TableHead className="text-center">Unit</TableHead>
                      <TableHead className="text-center">Ref. range</TableHead>
                      <TableHead className="text-center">Agreement</TableHead>
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
                          />
                          {f.unit && <span className="text-xs text-muted-foreground block">({f.unit})</span>}
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {f.unit ?? "—"}
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
                            {f.agreement}
                          </Badge>
                          {f.userEdited && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              edited
                            </Badge>
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
              <img
                src={`/api/documents/${doc.id}/file`}
                alt="Original document"
                className="w-full h-auto block max-h-[50vh] object-contain mx-auto"
              />
            </TabsContent>
            <TabsContent value="extracted">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-center">Agreement</TableHead>
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
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={f.agreement === "match" ? "default" : "destructive"}>
                            {f.agreement}
                          </Badge>
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
