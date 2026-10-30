"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  saveSampleDocument,
  saveSampleExtraction,
} from "@/lib/sample-storage";
import { createWorker, type Worker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Dictionary } from "@/lib/i18n";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MAX_SIDE = 2000;
const MAX_BYTES = 4 * 1024 * 1024;
const TARGET_BYTES = 2 * 1024 * 1024;

type UploadedFile = {
  file: File;
  ocrText: string;
};

export function UploadZone({ dict }: { dict: Dictionary }) {
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [uploading, setUploading] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const compressImage = useCallback(
    async (file: File): Promise<Blob> => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      const b = await new Promise<Blob>((resolve, reject) => {
        img.onload = async () => {
          try {
            let { width, height } = img;
            if (Math.max(width, height) > MAX_SIDE) {
              const scale = MAX_SIDE / Math.max(width, height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas context unavailable"));
            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.9;
            let blob: Blob | null = null;
            while (quality > 0.4) {
              const b = await new Promise<Blob | null>((res) =>
                canvas.toBlob(res, "image/jpeg", quality)
              );
              if (!b) break;
              blob = b;
              if (b.size <= TARGET_BYTES) break;
              quality -= 0.1;
            }
            if (!blob) return reject(new Error("Compression failed"));
            resolve(blob);
          } finally {
            URL.revokeObjectURL(img.src);
          }
        };
        img.onerror = () => reject(new Error("Image load failed"));
      });
      return b;
    },
    []
  );

  const runOcr = useCallback(
    async (blob: Blob): Promise<string> => {
      if (workerRef.current === null) {
        workerRef.current = await createWorker("eng+ben");
      }
      const worker = workerRef.current;
      const { data } = await worker.recognize(blob);
      return data.text.trim();
    },
    []
  );
  const renderPdfPage = useCallback(
    async (pdf: PDFDocumentProxy, pageNumber: number): Promise<string> => {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({
        canvas,
        viewport,
      }).promise;
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/png")
      );
      if (!blob) return "";
      return runOcr(blob);
    },
    [runOcr]
  );

  const processFile = useCallback(
    async (selected: File): Promise<UploadedFile> => {
      const mime = selected.type;
      let fileToUpload: File | Blob = selected;
      let text = "";

      if (mime === "application/pdf") {
        const arrayBuf = await selected.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuf });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        if (numPages > 5) {
          throw new Error("PDF exceeds 5 pages");
        }
        const parts: string[] = [];
        for (let i = 1; i <= numPages; i++) {
          const t = await renderPdfPage(pdf, i);
          if (t) parts.push(t);
        }
        text = parts.join("\n");
        fileToUpload = selected;
      } else if (mime.startsWith("image/")) {
        const blob = await compressImage(selected);
        if (blob.size > MAX_BYTES) {
          throw new Error("Image too large after compression");
        }
        text = await runOcr(blob);
        fileToUpload = new File([blob], selected.name, { type: "image/jpeg" });
      } else {
        throw new Error("Unsupported file type");
      }

      return { file: fileToUpload as File, ocrText: text };
    },
    [compressImage, renderPdfPage, runOcr]
  );

  const router = useRouter();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setOcrText("");
    setUploading(true);
    try {
      const result = await processFile(selected);
      setFile(result.file as File);
      setOcrText(result.ocrText);
      toast.success(dict.common.save);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : dict.common.error
      );
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  async function handleSample(fileName: string) {
    setUploading(true);
    try {
      const res = await fetch("/api/documents/sample", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load sample");
      }
      const data = (await res.json()) as {
        id: string;
        status: string;
        fileName: string;
        document: unknown;
        extraction: unknown;
        message?: string;
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      saveSampleDocument(data.document as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      saveSampleExtraction(data.extraction as any);
      toast.success(data.message ?? "Sample loaded — review it in Documents");
      if (data.id) router.push(`/documents/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setUploading(false);
    }
  }

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ocrText", ocrText);
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = (await res.json()) as {
        id: string;
        status: string;
        fileName: string;
        document?: unknown;
        extraction?: unknown;
        message?: string;
      };
      // Persist document + extraction in localStorage so they survive
      // across Vercel serverless instances (demo mode uses in-memory
      // storage that doesn't share between instances).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (data.document) saveSampleDocument(data.document as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (data.extraction) saveSampleExtraction(data.extraction as any);
      toast.success("Uploaded — review your extracted values");
      if (data.id) router.push(`/documents/${data.id}`);
      setFile(null);
      setOcrText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setUploading(false);
    }
  };

  const accept = ".jpg,.jpeg,.png,.pdf";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="file-upload">{dict.documents.upload}</Label>
        <Input
          id="file-upload"
          type="file"
          accept={accept}
          onChange={handleFile}
          disabled={uploading}
        />
        {file && (
          <p className="text-sm text-muted-foreground">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>
      {ocrText && (
        <div className="border rounded-lg p-3 bg-muted/50 text-sm">
          <Label className="text-xs font-semibold mb-1 block">
            OCR text (review before upload)
          </Label>
          <Input
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            className="h-32 font-mono text-xs"
            disabled={uploading}
          />
        </div>
      )}
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          JPG/PNG/PDF · ≤ 4 MB · max 5 PDF pages · OCR runs in your browser
        </p>
        <Button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="min-h-[44px]"
        >
          {uploading ? dict.common.loading : dict.documents.upload}
        </Button>
      </div>
      <Separator />
      <div className="border-t pt-4">
        <p className="text-xs font-semibold mb-3">
          Or try sample data (no real file needed)
        </p>
        <div className="flex flex-wrap gap-2">
          {["Sample CBC Report.jpg", "Sample Prescription.jpg"].map((name) => (
            <Button
              key={name}
              variant="outline"
              size="sm"
              onClick={() => handleSample(name)}
              disabled={uploading}
              className="min-h-[44px]"
            >
              {name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
