"use client";

import { useEffect, useState } from "react";
import { Orb } from "@/components/orb";
import { useDictionary } from "@/lib/use-dictionary";
import { cn } from "@/lib/utils";

/** After this long, say it's still working, so a slow answer doesn't look like a broken app. */
const REASSURE_AFTER_MS = 8000;

/** The waiting state for anything AI is doing: a paper being scanned, and words saying what's happening. */
export function AiLoader({ label, className }: { label: string; className?: string }) {
  const dict = useDictionary();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), REASSURE_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" className={cn("orb-halo flex flex-col items-center gap-3 py-5 text-center", className)}>
      <Orb working className="size-24" />
      <div>
        <p className="font-medium">{label}</p>
        {slow && <p className="text-sm text-muted-foreground">{dict.common.stillWorking}</p>}
      </div>
    </div>
  );
}
