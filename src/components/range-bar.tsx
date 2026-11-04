import { cn } from "@/lib/utils";
import { parseRange, positionOnBar, rangeStatus } from "@/lib/range";
import { formatDate, toLocaleDigits } from "@/lib/digits";
import type { Dictionary, Locale } from "@/lib/i18n";

/**
 * MediSathi's signature element: one lab value as a dot on a bar whose shaded
 * middle is the normal range, so "normal or not" is readable without numbers.
 * Falls back to the plain value when the report gives no usable range.
 */
export function RangeBar({
  name,
  value,
  rawValue,
  unit,
  referenceRangeRaw,
  dict,
  locale,
  previous,
  className,
}: {
  name: string;
  value: number | null | undefined;
  rawValue: string;
  unit?: string | null;
  referenceRangeRaw?: string | null;
  dict: Dictionary;
  locale: Locale;
  /** An earlier value of this test: a hollow mark on the bar, and said in words. */
  previous?: { value: number; rawValue: string; date: string } | null;
  className?: string;
}) {
  const range = parseRange(referenceRangeRaw);
  const status = range && value != null ? rangeStatus(value, range) : null;
  const statusText =
    status === "low" ? dict.range.low : status === "high" ? dict.range.high : status === "normal" ? dict.range.normal : null;
  const shown = toLocaleDigits(rawValue || String(value ?? ""), locale);
  const wasText = previous
    ? dict.range.was
        .replace("{{value}}", toLocaleDigits(previous.rawValue, locale))
        .replace("{{date}}", formatDate(previous.date, locale))
    : null;

  return (
    <div className={cn("py-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{name}</span>
        <span className="font-heading text-xl font-semibold tabular-nums">
          {shown}
          {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
        </span>
      </div>
      {range && value != null ? (
        <>
          <div
            className="relative mt-2.5 h-3.5 rounded-full bg-muted"
            role="img"
            aria-label={`${name}: ${shown}${unit ? ` ${unit}` : ""}. ${statusText}. ${dict.range.normalRange} ${toLocaleDigits(referenceRangeRaw ?? "", locale)}${wasText ? `. ${wasText}` : ""}`}
          >
            <div className="absolute inset-y-0 left-1/4 right-1/4 bg-chart-1/35" />
            {previous && (
              <div
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-chart-4"
                style={{ left: `${positionOnBar(previous.value, range)}%` }}
              />
            )}
            <div
              className={cn(
                "absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]",
                status === "normal" ? "border-popover bg-primary" : "border-primary bg-warning"
              )}
              style={{ left: `${positionOnBar(value, range)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-sm">
            <span className={cn("font-medium", status === "normal" ? "text-primary" : "text-warning-foreground")}>
              {statusText}
            </span>
            <span className="text-muted-foreground">
              {dict.range.normalRange} {toLocaleDigits(referenceRangeRaw ?? "", locale)}
            </span>
          </div>
          {wasText && <p className="mt-0.5 text-sm text-muted-foreground">{wasText}</p>}
        </>
      ) : referenceRangeRaw ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {dict.range.normalRange} {toLocaleDigits(referenceRangeRaw, locale)}
        </p>
      ) : null}
    </div>
  );
}
