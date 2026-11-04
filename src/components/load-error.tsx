"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/use-dictionary";

/** A failed load, said plainly. An empty list here would look like "you have no records". */
export function LoadError() {
  const dict = useDictionary();
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-2xl border bg-card-lead p-4">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-5 shrink-0 text-warning-foreground" aria-hidden />
        {dict.common.loadFailed}
      </p>
      <Button className="h-14 w-full gap-2 text-lg font-semibold" onClick={() => window.location.reload()}>
        <RefreshCw className="size-5!" aria-hidden />
        {dict.common.retry}
      </Button>
    </section>
  );
}
