"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "@/components/nav-items";
import type { Dictionary } from "@/lib/i18n";

/** Mobile bottom bar: the same five places as the desktop header, no hidden "More" menu. */
export function BottomNav({ dict, user }: { dict: Dictionary; user?: { email?: string } | null }) {
  const pathname = usePathname();
  if (!user) return null;

  return (
    <nav
      aria-label={dict.nav.primary}
      className="no-print fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          const { Icon } = item;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-xs font-medium leading-tight focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/12"
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>{dict.nav[item.key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
