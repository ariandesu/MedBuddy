"use client";

import { Bar, BarChart, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type GapBarPoint = { date: string; value: number | null };

type Slot = GapBarPoint & { slot: number; last: boolean };

const CONFIG = { value: { label: "value" } };

/**
 * One bar per day on a pale track. A day with no value is an empty dashed slot,
 * never a zero, and the last bar (today) takes the data colour.
 */
export function GapBars({
  data,
  label,
  describe,
  className,
}: {
  data: GapBarPoint[];
  /** Says what is charted. The logged values are added to it for screen readers. */
  label: string;
  describe: (point: GapBarPoint & { value: number }) => string;
  className?: string;
}) {
  const logged = data.filter((p): p is GapBarPoint & { value: number } => p.value != null);
  const top = Math.max(1, ...logged.map((p) => p.value)) * 1.25;
  // Every day gets a full-height slot, and the shape draws what's in it: Recharts
  // skips null values, so a bar keyed on the value could never draw the gap.
  const slots: Slot[] = data.map((p, i) => ({ ...p, slot: top, last: i === data.length - 1 }));

  return (
    <div role="img" aria-label={`${label}: ${logged.map(describe).join(", ")}`} className={cn("h-32 w-full", className)}>
      <ChartContainer config={CONFIG} className="aspect-auto size-full">
        <BarChart data={slots} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap="12%" accessibilityLayer={false}>
          <YAxis hide domain={[0, top]} />
          <Bar
            dataKey="slot"
            isAnimationActive={false}
            shape={(props: { x?: number; y?: number; width?: number; height?: number; payload?: Slot }) => {
              const { x = 0, y = 0, width = 0, height = 0, payload } = props;
              const rx = Math.min(width / 2, 10);
              if (payload?.value == null) {
                // Too narrow for a dashed outline to read: a tick on the baseline instead.
                if (width < 12) return <rect x={x} y={y + height - 2} width={width} height={2} fill="var(--chart-4)" />;
                return <rect x={x} y={y} width={width} height={height} rx={rx} fill="none" stroke="var(--chart-4)" strokeDasharray="3 3" />;
              }
              const filled = (payload.value / top) * height;
              return (
                <g>
                  <rect x={x} y={y} width={width} height={height} rx={rx} fill="var(--secondary)" />
                  <rect x={x} y={y + height - filled} width={width} height={filled} rx={rx} fill={payload.last ? "var(--chart-1)" : "var(--primary)"} />
                </g>
              );
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
