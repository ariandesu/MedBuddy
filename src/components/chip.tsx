import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** A small toggle. `mark` shows a check when on, for choices rather than switches. */
export function Chip({ active, mark, onToggle, children }: {
  active: boolean;
  mark?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "flex min-h-12 items-center gap-2 rounded-full border px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-secondary hover:bg-card-lead"
      )}
    >
      {active && mark && <Check className="size-4" aria-hidden />}
      {children}
    </button>
  );
}
