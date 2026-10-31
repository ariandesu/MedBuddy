import { FlaskConical } from "lucide-react";
import { isDemoDataMode, isDemoAiMode } from "@/server/env";
import type { Dictionary } from "@/lib/i18n";

/** One thin status line instead of two full-width alerts. Never throws. */
export function DemoBanners({ dict }: { dict: Dictionary }) {
  const demoData = isDemoDataMode();
  const demoAi = isDemoAiMode();
  if (!demoData && !demoAi) return null;
  const text = demoData && demoAi
    ? dict.demo.bothBanner
    : demoData
      ? dict.demo.dataBanner
      : dict.demo.aiBanner;
  return (
    <p
      role="status"
      className="no-print flex items-center justify-center gap-2 border-b bg-secondary/60 px-4 py-1.5 text-center text-sm text-secondary-foreground"
    >
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      {text}
    </p>
  );
}
