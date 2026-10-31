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
  (i) => i.key !== "summary" && i.key !== "report" && i.key !== "ask"
);

export function BottomNav({ dict, user }: { dict: Dictionary; user?: { email?: string } | null }) {
  const pathname = usePathname();
  if (!user) return null;
  const moreActive = MORE_ITEMS.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-2 py-2">
        {MAIN_ITEMS.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-xs font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="size-6" aria-hidden />
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
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-xs font-medium",
                  moreActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <MoreHorizontal className="size-6" aria-hidden />
                <span className="leading-none">More</span>
              </Link>
            </SheetTrigger>
            <SheetContent>
              {MORE_ITEMS.map(({ href, key, Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
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
