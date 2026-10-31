import Link from "next/link";
import { cn } from "@/lib/utils";

export type PageTab = { value: string; label: string; href: string };

/**
 * URL-driven tabs (?tab=…). Plain links, so they work before hydration,
 * keep the tab on refresh/share, and let each tab be a server or client view.
 */
export function PageTabs({ tabs, active, label }: { tabs: PageTab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="no-print">
      <ul className="grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-muted p-1">
        {tabs.map((t) => {
          const isActive = t.value === active;
          return (
            <li key={t.value}>
              <Link
                href={t.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-lg px-3 text-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
