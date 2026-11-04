import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const BACK_CLASS =
  "flex size-12 items-center justify-center rounded-full bg-secondary hover:bg-card-lead focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * The one h1 on a screen. With `back` it becomes the focused-flow title bar:
 * a round back button and a centred, smaller title.
 */
export function PageTitle({
  title,
  subtitle,
  overline,
  back,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  back?: { href: string; label: string } | { onClick: () => void; label: string };
  /** One control on the right of a top-level title. */
  action?: ReactNode;
  className?: string;
}) {
  if (back) {
    return (
      <header className={cn("grid grid-cols-[3rem_1fr_3rem] items-center gap-2", className)}>
        {"href" in back ? (
          <Link href={back.href} aria-label={back.label} className={BACK_CLASS}>
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
        ) : (
          <button type="button" onClick={back.onClick} aria-label={back.label} className={BACK_CLASS}>
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        )}
        <div className="min-w-0 text-center">
          <h1 className="font-heading text-xl font-semibold leading-snug">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
    );
  }
  return (
    <header className={cn(action && "flex items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        {overline && <p className="text-muted-foreground">{overline}</p>}
        <h1 className="font-heading text-[1.7647rem] font-semibold leading-[1.2] [html[lang=bn]_&]:leading-[1.3]">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
