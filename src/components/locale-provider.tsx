"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import en from "@/lib/i18n/en.json";
import bn from "@/lib/i18n/bn.json";
import type { Dictionary, Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/index";

interface LocaleContextType {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

/**
 * The server reads the locale cookie on every request and passes it in, so the
 * prop is the single source of truth. (Keeping a copy in state meant client
 * pages kept the old language after switching until a full reload.)
 */
export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const router = useRouter();
  const locale = initialLocale;
  const dict: Dictionary = locale === "bn" ? bn : en;

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      try {
        document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000`;
      } catch {}
      router.refresh();
    },
    [router]
  );

  return (
    <LocaleContext.Provider value={{ locale, dict, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
