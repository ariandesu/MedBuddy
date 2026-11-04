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
      className="no-print mx-4 mt-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-1.5 text-sm md:mx-auto md:w-[calc(100%-2rem)] md:max-w-5xl"
    >
      <FlaskConical className="size-4 shrink-0" aria-hidden />
      {text}
    </p>
  );
}
