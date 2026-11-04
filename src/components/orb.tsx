import { cn } from "@/lib/utils";

/**
 * A paper being read, inside a glass sphere. Only for when AI is working or
 * waiting for a question: it is the product's one glow. Decorative, so the
 * state it stands for must also be said in words next to it.
 */
export function Orb({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("orb size-44", className)}>
      <span className="orb-sheet">
        <i />
        <i className="orb-lit" />
        <i />
        <i />
      </span>
    </span>
  );
}
