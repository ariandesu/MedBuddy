"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants, Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Camera, Check, FileUp, ScanSearch } from "lucide-react";
import { Orb } from "@/components/orb";
import { Tile } from "@/components/tile";
import { toast } from "sonner";
import { createWorker, type Worker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { cn } from "@/lib/utils";
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

const PICK_CLASS =
  "h-16 w-full cursor-pointer gap-2 text-lg font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring";

const SAMPLES = [
  { url: "/samples/sample-cbc.jpg", fileName: "Sample-blood-test.jpg" },
  { url: "/samples/sample-prescription.jpg", fileName: "Sample-prescription.jpg" },
] as const;

export function UploadZone({ dict, onBusyChange }: { dict: Dictionary; onBusyChange?: (busy: boolean) => void }) {
  const [stage, setStageState] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const setStage = (next: Stage) => {
    setStageState(next);
    onBusyChange?.(next !== "idle");
  };

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
        img.onerror = () => reject(new Error(dict.documents.unsupported));
      });
      return b;
    },
    [dict.documents.unsupported]
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
          throw new Error(dict.documents.tooManyPages);
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
          throw new Error(dict.documents.tooLarge);
        }
        ({ text, words } = await runOcr(blob));
        const jpgName = selected.name.replace(/\.[^.]+$/, "") + ".jpg";
        fileToUpload = new File([blob], jpgName, { type: "image/jpeg" });
      } else {
        throw new Error(dict.documents.unsupported);
      }

      return { file: fileToUpload as File, ocrText: text, ocrWords: words };
    },
    [compressImage, renderPdfPage, runOcr, dict.documents.tooLarge, dict.documents.tooManyPages, dict.documents.unsupported]
  );

  const router = useRouter();

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
    if (data.id) router.push(`/documents/${data.id}`);
  }

  /** Files and samples run the same pipeline: OCR on this device, then Muse reads the paper. */
  async function run(getFile: () => Promise<File>) {
    setError(null);
    setStage("ocr");
    try {
      await send(await processFile(await getFile()));
      // Stay on the reading view until the review page takes over.
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.common.error);
      setStage("idle");
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (selected) void run(async () => selected);
  };

  const handleSample = (sample: (typeof SAMPLES)[number]) =>
    void run(async () => {
      const blob = await (await fetch(sample.url)).blob();
      return new File([blob], sample.fileName, { type: "image/jpeg" });
    });

  if (stage !== "idle") {
    const phoneDone = stage === "ai";
    return (
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <p className="font-heading text-2xl font-semibold">{dict.documents.readingTitle}</p>
          <p className="mt-1">{dict.documents.readingNote}</p>
        </div>
        <div className="orb-halo flex justify-center py-8">
          <Orb working className="size-36" />
        </div>
        <ul role="status" className="flex flex-col divide-y rounded-2xl border bg-card px-4">
          <li className="flex min-h-[4.25rem] items-center gap-3 py-2">
            <Tile>{phoneDone ? <Check className="size-5" /> : <ScanSearch className="size-5" />}</Tile>
            <span className="font-medium">{phoneDone ? dict.documents.stagePhoneDone : dict.documents.stageOcr}</span>
          </li>
          {phoneDone && (
            <li className="flex min-h-[4.25rem] items-center gap-3 py-2">
              <Tile><ScanSearch className="size-5" /></Tile>
              <span className="font-medium">{dict.documents.stageAi}</span>
            </li>
          )}
        </ul>
        <Progress value={phoneDone ? 50 : 15} aria-label={dict.documents.readingTitle} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-2xl bg-warning-wash p-3 font-medium text-warning-foreground">
          {error}
        </p>
      )}
      <div>
        <input id="paper-camera" type="file" accept="image/*" capture="environment" onChange={handleFile} className="peer sr-only" />
        <label
          htmlFor="paper-camera"
          className={cn(buttonVariants(), PICK_CLASS)}
        >
          <Camera className="size-5!" aria-hidden />
          {dict.documents.takePhoto}
        </label>
      </div>
      <div>
        <input id="paper-file" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} className="peer sr-only" />
        <label
          htmlFor="paper-file"
          className={cn(buttonVariants({ variant: "secondary" }), PICK_CLASS)}
        >
          <FileUp className="size-5!" aria-hidden />
          {dict.documents.chooseFile}
        </label>
      </div>
      <p className="text-sm text-muted-foreground">{dict.documents.limits}</p>
      <div>
        <p className="mb-2 font-heading text-lg font-semibold">{dict.documents.sampleTitle}</p>
        <div className="flex flex-wrap gap-2">
          {([dict.documents.sampleCbc, dict.documents.samplePrescription] as const).map((label, i) => (
            <Button key={label} variant="outline" onClick={() => handleSample(SAMPLES[i])} className="h-12 px-4 text-base">
              {label}
            </Button>
          ))}
        </div>
      </div>
      <p className="rounded-2xl border bg-card p-3 text-sm">{dict.documents.privacy}</p>
    </div>
  );
}
