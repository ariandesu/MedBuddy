"use client";

import { useState } from "react";
import dynamicLoader from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/lib/use-dictionary";

// tesseract.js and pdfjs only load once someone actually opens the sheet.
const UploadZone = dynamicLoader(() => import("@/components/upload-zone").then((m) => m.UploadZone), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full rounded-2xl" />,
});

/** `defaultOpen` comes from /records?add=1, so other screens can link straight to it. */
export function AddPaperSheet({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const dict = useDictionary();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        // Reading can't be cancelled halfway: the paper is already on its way.
        if (!next && busy) return;
        setOpen(next);
        if (!next && defaultOpen) router.replace("/records");
      }}
    >
      <SheetTrigger render={<Button className="h-12 shrink-0 px-4 text-base font-semibold" />}>
        <Plus className="size-5!" aria-hidden />
        {dict.documents.addPaper}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[92dvh] gap-3 overflow-y-auto rounded-t-[2rem] bg-background px-4 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] text-base"
      >
        <div className="flex items-center justify-between gap-2">
          <SheetTitle className="font-heading text-xl font-semibold">{dict.documents.sheetTitle}</SheetTitle>
          {!busy && (
            <SheetClose render={<Button variant="secondary" size="icon" className="size-12" aria-label={dict.common.close} />}>
              <X className="size-5!" aria-hidden />
            </SheetClose>
          )}
        </div>
        {open && <UploadZone dict={dict} onBusyChange={setBusy} />}
      </SheetContent>
    </Sheet>
  );
}
