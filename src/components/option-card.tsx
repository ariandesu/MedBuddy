import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** A full-width choice: the whole row is the tap target. `urgent` marks a red-flag symptom. */
export function OptionCard({
  label,
  description,
  active,
  urgent,
  onToggle,
}: {
  label: string;
  description?: string;
  active: boolean;
  urgent?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-[20px] border px-4 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        urgent && "border-destructive",
        active ? "bg-card-lead" : "bg-card hover:bg-card-lead"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
          !active && "border-chart-4",
          active && (urgent ? "border-destructive bg-destructive text-destructive-foreground" : "border-primary bg-primary text-primary-foreground")
        )}
      >
        {active && <Check className="size-4" />}
      </span>
    </button>
  );
}
