"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Files,
  ClipboardCheck,
  ChartLine,
  MessageCircleQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

const items = [
  { href: "/dashboard", key: "dashboard" as const, Icon: LayoutDashboard },
  { href: "/documents", key: "documents" as const, Icon: Files },
  { href: "/checkin", key: "checkin" as const, Icon: ClipboardCheck },
  { href: "/timeline", key: "timeline" as const, Icon: ChartLine },
  { href: "/ask", key: "ask" as const, Icon: MessageCircleQuestion },
];

export function BottomNav({ dict }: { dict: Dictionary }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-2 py-2">
        {items.map(({ href, key, Icon }) => {
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
                <span className="leading-none">{dict.nav[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
