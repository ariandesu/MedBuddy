"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { createWorker, type Worker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Dictionary } from "@/lib/i18n";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MAX_SIDE = 2000;
const MAX_BYTES = 4 * 1024 * 1024;
const TARGET_BYTES = 2 * 1024 * 1024;

type OcrWord = { t: string; x: number; y: number; w: number; h: number; l: number };

type UploadedFile = {
  file: File;
  ocrText: string;
  ocrWords: OcrWord[];
};

type Stage = "idle" | "ocr" | "ai";

const SAMPLES = [
  { url: "/samples/sample-cbc.jpg", fileName: "Sample-blood-test.jpg" },
  { url: "/samples/sample-prescription.jpg", fileName: "Sample-prescription.jpg" },
] as const;

export function UploadZone({ dict, onUploadComplete }: { dict: Dictionary; onUploadComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrWords, setOcrWords] = useState<OcrWord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
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
    async (blob: Blob): Promise<{ text: string; words: OcrWord[] }> => {
      if (workerRef.current === null) {
        workerRef.current = await createWorker("eng+ben");
      }
      const worker = workerRef.current;
      const [{ data }, bitmap] = await Promise.all([
        worker.recognize(blob, {}, { text: true, blocks: true }),
        createImageBitmap(blob),
      ]);
      // Word positions as shares of the image, so the review page can highlight them.
      const words: OcrWord[] = [];
      let lineNumber = 0;
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            for (const { text, bbox } of line.words) {
              words.push({
                t: text,
                x: bbox.x0 / bitmap.width,
                y: bbox.y0 / bitmap.height,
                w: (bbox.x1 - bbox.x0) / bitmap.width,
                h: (bbox.y1 - bbox.y0) / bitmap.height,
                l: lineNumber,
              });
            }
            lineNumber++;
          }
        }
      }
      bitmap.close();
      return { text: data.text.trim(), words };
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
      return (await runOcr(blob)).text;
    },
    [runOcr]
  );

  const processFile = useCallback(
    async (selected: File): Promise<UploadedFile> => {
      const mime = selected.type;
      let fileToUpload: File | Blob = selected;
      let text = "";
      let words: OcrWord[] = [];

      if (mime === "application/pdf") {
        if (selected.size > MAX_BYTES) {
          throw new Error(dict.documents.tooLarge);
        }
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
        ({ text, words } = await runOcr(blob));
        const jpgName = selected.name.replace(/\.[^.]+$/, "") + ".jpg";
        fileToUpload = new File([blob], jpgName, { type: "image/jpeg" });
      } else {
        throw new Error(dict.documents.unsupported);
      }

      return { file: fileToUpload as File, ocrText: text, ocrWords: words };
    },
    [compressImage, renderPdfPage, runOcr]
  );

  const router = useRouter();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setOcrText("");
    setOcrWords([]);
    setUploading(true);
    setStage("ocr");
    try {
      const result = await processFile(selected);
      setFile(result.file as File);
      setOcrText(result.ocrText);
      setOcrWords(result.ocrWords);
      toast.success(dict.documents.ocrReady);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : dict.common.error
      );
      setFile(null);
    } finally {
      setUploading(false);
      setStage("idle");
    }
  };

  async function send(upload: UploadedFile) {
    setStage("ai");
    const formData = new FormData();
    formData.append("file", upload.file);
    formData.append("ocrText", upload.ocrText);
    formData.append("ocrWords", JSON.stringify(upload.ocrWords));
    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    // Already uploaded: its earlier reading is what the user wants to see.
    if (!res.ok && !(res.status === 409 && data.id)) {
      throw new Error(dict.documents.uploadFailed);
    }
    toast.success(dict.documents.uploaded);
    if (data.id) {
      router.push(`/documents/${data.id}`);
      onUploadComplete?.();
    }
  }

  /** Samples run the real pipeline: OCR on this device, then Muse reads the paper. */
  async function handleSample(sample: (typeof SAMPLES)[number]) {
    setUploading(true);
    setStage("ocr");
    try {
      const blob = await (await fetch(sample.url)).blob();
      await send(await processFile(new File([blob], sample.fileName, { type: "image/jpeg" })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setUploading(false);
      setStage("idle");
    }
  }

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await send({ file, ocrText, ocrWords });
      setFile(null);
      setOcrText("");
      setOcrWords([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : dict.common.error);
    } finally {
      setUploading(false);
      setStage("idle");
    }
  };

  const accept = ".jpg,.jpeg,.png,.pdf";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <input
          id="file-upload"
          type="file"
          accept={accept}
          onChange={handleFile}
          disabled={uploading}
          className="peer sr-only"
        />
        <label
          htmlFor="file-upload"
          className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center font-medium text-primary hover:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-60"
        >
          <Camera className="size-7" aria-hidden />
          {file ? dict.documents.pickChange : dict.documents.pick}
        </label>
        {file && (
          <p className="break-all text-sm text-muted-foreground">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}
      </div>
      {ocrText && (
        <div className="border rounded-lg p-3 bg-muted/50 text-sm">
          <Label className="text-xs font-semibold mb-1 block">
            {dict.documents.ocrLabel}
          </Label>
          <Textarea
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            rows={6}
            className="text-base"
            disabled={uploading}
          />
        </div>
      )}
      {file && (
        <Button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="h-12 w-full text-base"
        >
          {uploading ? dict.common.loading : dict.documents.upload}
        </Button>
      )}
      {stage !== "idle" && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 font-medium text-primary">
          <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
          {stage === "ocr" ? dict.documents.stageOcr : dict.documents.stageAi}
        </p>
      )}
      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {dict.documents.sampleTitle}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([dict.documents.sampleCbc, dict.documents.samplePrescription] as const).map((label, i) => (
            <Button
              key={label}
              variant="outline"
              onClick={() => handleSample(SAMPLES[i])}
              disabled={uploading}
              className="h-11"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
