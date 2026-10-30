import { TriangleAlert, FlaskConical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isDemoDataMode, isDemoAiMode } from "@/server/env";
import type { Dictionary } from "@/lib/i18n";

export function DemoBanners({ dict }: { dict: Dictionary }) {
  // Called at request time (pages are force-dynamic). Never throws.
  const demoData = isDemoDataMode();
  const demoAi = isDemoAiMode();
  if (!demoData && !demoAi) return null;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 pt-4">
      {demoData && (
        <Alert>
          <FlaskConical className="size-5" aria-hidden />
          <AlertDescription>{dict.demo.dataBanner}</AlertDescription>
        </Alert>
      )}
      {demoAi && (
        <Alert>
          <TriangleAlert className="size-5" aria-hidden />
          <AlertDescription>{dict.demo.aiBanner}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
