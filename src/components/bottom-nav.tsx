"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Files,
  ClipboardCheck,
  ChartLine,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS, MORE_ITEMS } from "@/components/nav-items";
import type { Dictionary } from "@/lib/i18n";

const MAIN_ITEMS = NAV_ITEMS.filter(
  (i) =>
    i.key === "dashboard" ||
    i.key === "documents" ||
    i.key === "checkin" ||
    i.key === "timeline"
);

export function BottomNav({ dict, user }: { dict: Dictionary; user?: { email?: string } | null }) {
  const pathname = usePathname();
  if (!user) return null;
  const moreActive = MORE_ITEMS.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 gap-0.5 px-1 py-1">
        {MAIN_ITEMS.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[10px] font-medium leading-tight",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="leading-none">{dict.nav[key as keyof typeof dict.nav]}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet>
            <SheetTrigger>
              <Link
                href="#more"
                aria-current={moreActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-md px-1 py-1 text-[10px] font-medium leading-tight",
                  moreActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <MoreHorizontal className="size-5" aria-hidden />
                <span className="leading-none">{dict.nav.more}</span>
              </Link>
            </SheetTrigger>
            <SheetContent className="w-[260px] p-3">
              {MORE_ITEMS.map(({ href, key, Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {dict.nav[key as keyof typeof dict.nav]}
                  </Link>
                );
              })}
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
