import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Dictionary, Locale } from "@/lib/i18n";

export function Header({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
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
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} label={dict.header.language} />
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            {dict.header.login}
          </Link>
        </div>
      </div>
    </header>
  );
}
