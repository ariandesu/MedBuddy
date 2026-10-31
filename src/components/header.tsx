"use client";

import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { NAV_ITEMS } from "@/components/nav-items";
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
    <header className="no-print sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/dashboard" className="flex min-h-[44px] items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulse className="size-6" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold">{dict.appName}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {dict.tagline}
            </span>
          </span>
        </Link>

        {/* Desktop nav (hidden on mobile) */}
        {user ? (
          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`text-sm font-medium min-h-[44px] ${
                    active ? "text-primary" : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <Icon className="size-4 mr-1.5" aria-hidden />
                  {dict.nav[item.key as keyof typeof dict.nav]}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={dict.header.language} />
          {user ? (
            <>
              <Avatar title={user.email}>
                <AvatarFallback>
                  {user.email.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <LogoutButton label={dict.header.logout} />
            </>
          ) : (
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              {dict.header.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
