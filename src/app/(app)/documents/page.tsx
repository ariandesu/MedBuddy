"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/upload-zone";
import { useDictionary } from "@/lib/use-dictionary";

type Doc = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
};

export default function DocumentsPage() {
  const dict = useDictionary();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data: { documents: Doc[] }) => {
        if (!cancelled) setDocs(data.documents ?? []);
      })
      .finally(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const statusBadge = (status: string) => {
    const variant: Record<string, "default" | "secondary" | "destructive"> = {
      uploaded: "default",
      processing: "default",
      needs_review: "secondary",
      confirmed: "default",
      failed: "destructive",
    };
    return <Badge variant={variant[status] ?? "secondary"}>{status}</Badge>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{dict.documents.title}</h1>
        <Button>
          <Upload aria-hidden />
          {dict.documents.upload}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.documents.upload}</CardTitle>
          <CardDescription>
            JPG/PNG/PDF · ≤ 4 MB · max 5 PDF pages · OCR runs in your browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadZone dict={dict} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.documents.title}</CardTitle>
          <CardDescription>{dict.documents.empty}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              Loading…
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {dict.documents.empty}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.fileName}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {d.mimeType}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {(d.sizeBytes / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell className="text-center">{statusBadge(d.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
