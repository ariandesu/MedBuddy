"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/**
 * One-tap toggle that names the language you'll switch TO, in that language,
 * so someone who can't read the current UI language can still find it.
 */
export function LanguageSwitcher({ locale }: { locale: Locale; label?: string }) {
  const router = useRouter();
  const next: Locale = locale === "bn" ? "en" : "bn";

  function switchLanguage() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      lang={next}
      className="flex min-h-11 items-center gap-1.5 rounded-full px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Languages className="size-4" aria-hidden />
      {next === "en" ? "English" : "বাংলা"}
    </button>
  );
}
