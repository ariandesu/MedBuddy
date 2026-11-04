import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Icon holder. `lead` is the black tile, one per screen; `pale` is for list rows. */
export function Tile({
  children,
  variant = "pale",
  className,
}: {
  children: ReactNode;
  variant?: "lead" | "pale";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        variant === "lead"
          ? "size-16 rounded-[18px] bg-primary text-primary-foreground"
          : "size-[52px] rounded-2xl bg-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
