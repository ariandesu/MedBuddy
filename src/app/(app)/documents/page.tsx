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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/upload-zone";
import { useDictionary } from "@/lib/use-dictionary";
import { buttonVariants } from "@/components/ui/button";

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

  const statusBadge = (status: string) => {
    const variant: Record<
      string,
      "default" | "secondary" | "destructive"
    > = {
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.documents.upload}</CardTitle>
          <CardDescription>
            {dict.documents.help}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadZone dict={dict} onUploadComplete={() => load()} />
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
              {dict.common.loading}
            </div>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {dict.documents.empty}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dict.documents.colFile}</TableHead>
                  <TableHead className="text-center">{dict.documents.colType}</TableHead>
                  <TableHead className="text-right">{dict.documents.colSize}</TableHead>
                  <TableHead className="text-center">{dict.documents.colStatus}</TableHead>
                  <TableHead className="text-center">{dict.documents.colAction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <Link href={`/documents/${d.id}`} className="underline-offset-4 hover:underline">
                        {d.fileName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {d.mimeType}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {(d.sizeBytes / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell className="text-center">{statusBadge(d.status)}</TableCell>
                    <TableCell className="text-center">
                      {d.status === "failed" ? (
                        <Button
                          onClick={() => {
                            void fetch(`/api/documents/${d.id}/retry`, {
                              method: "POST",
                            }).then(() => load());
                          }}
                          variant="outline"
                          size="sm"
                          className="min-h-[44px]"
                        >
                          {dict.documents.retry}
                        </Button>
                      ) : (
                        <Link
                          href={`/documents/${d.id}`}
                          className={buttonVariants({
                            variant: d.status === "needs_review" ? "secondary" : "outline",
                            size: "sm",
                            className: "min-h-[44px]",
                          })}
                        >
                          {d.status === "needs_review"
                            ? dict.documents.review
                            : dict.documents.view}
                        </Link>
                      )}
                    </TableCell>
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
