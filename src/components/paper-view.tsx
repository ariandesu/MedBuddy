"use client";

import { useState, type ReactNode } from "react";
import { FileText, ImageOff } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";

export type PaperBox = { x: number; y: number; w: number; h: number } | null | undefined;

/** The original paper, with one value lit on it. `caption` sits beside the full-paper link. */
export function PaperView({ doc, dict, box, caption, className }: {
  doc: { id: string; mimeType: string };
  dict: Dictionary;
  box?: PaperBox;
  caption?: ReactNode;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const fileUrl = `/api/documents/${doc.id}/file`;
  const isPdf = doc.mimeType === "application/pdf";

  return (
    <section aria-label={dict.review.original} className={`overflow-hidden rounded-2xl bg-popover shadow-md ${className ?? ""}`}>
      {isPdf ? (
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
          <FileText className="size-8" aria-hidden />
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
            {dict.review.openPdf}
          </a>
        </div>
      ) : failed ? (
        <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
          <ImageOff className="size-8" aria-hidden />
          <p>{dict.review.noPreview}</p>
        </div>
      ) : (
        // Sized to the image so the highlight's percentages land on the paper itself.
        <div className="relative mx-auto w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={dict.review.originalDocumentAlt}
            className="block max-h-[34vh] w-auto max-w-full md:max-h-[70vh]"
            onError={() => setFailed(true)}
          />
          {box && (
            <span
              aria-hidden
              className="paper-highlight"
              style={{
                left: `${(box.x - 0.008) * 100}%`,
                top: `${(box.y - 0.004) * 100}%`,
                width: `${(box.w + 0.016) * 100}%`,
                height: `${(box.h + 0.008) * 100}%`,
              }}
            />
          )}
        </div>
      )}
      {!isPdf && !failed && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-t px-3 text-sm">
          {caption && <p aria-live="polite" className="py-2 text-muted-foreground">{caption}</p>}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex min-h-12 items-center font-medium underline underline-offset-4"
          >
            {dict.review.openPaper}
          </a>
        </div>
      )}
    </section>
  );
}
