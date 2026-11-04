import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/tile";
import { toLocaleDigits } from "@/lib/digits";

/** − value + control. Starts empty ("not set") so nothing is saved by accident. */
export function Stepper({
  id,
  label,
  hint,
  unit,
  icon,
  value,
  start,
  step,
  min,
  max,
  onChange,
  addLabel,
  locale,
}: {
  id: string;
  label: string;
  /** Yesterday's value, say. Never pre-fills the control. */
  hint?: string;
  unit: string;
  icon: ReactNode;
  value: number | null;
  start: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number | null) => void;
  addLabel: string;
  locale: "bn" | "en";
}) {
  return (
    <div className="flex min-h-16 flex-wrap items-center gap-3 py-3" role="group" aria-labelledby={`${id}-label`}>
      <Tile>{icon}</Tile>
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      {value == null ? (
        <Button type="button" variant="outline" className="h-12 min-w-24" onClick={() => onChange(start)}>
          <Plus aria-hidden /> {addLabel}
        </Button>
      ) : (
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-12"
            aria-label={`${label} −`}
            onClick={() => (value - step < min ? onChange(null) : onChange(value - step))}
          >
            <Minus aria-hidden />
          </Button>
          <output aria-live="polite" className="text-center font-heading text-3xl font-medium tabular-nums">
            {toLocaleDigits(String(value), locale)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
          </output>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-12"
            aria-label={`${label} +`}
            disabled={value + step > max}
            onClick={() => onChange(value + step)}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
