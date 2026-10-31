"use client";

import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { NAV_ITEMS, isNavActive } from "@/components/nav-items";
import { usePathname } from "next/navigation";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { SessionUser } from "@/server/auth";

export function Header({
  locale,
  dict,
  user,
}: {
  locale: Locale;
  dict: Dictionary;
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="size-5" aria-hidden />
          </span>
          <span className="font-heading text-lg font-semibold">{dict.appName}</span>
        </Link>

        {user ? (
          <nav aria-label={dict.nav.primary} className="hidden flex-1 justify-center md:flex">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = isNavActive(item, pathname);
                const { Icon } = item;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4 lg:inline hidden" aria-hidden />
                      {dict.nav[item.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
          <LanguageSwitcher locale={locale} />
          {user ? (
            <LogoutButton label={dict.header.logout} />
          ) : (
            <Link
              href="/login"
              className="flex min-h-11 items-center rounded-full border px-4 font-medium hover:bg-muted"
            >
              {dict.header.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
