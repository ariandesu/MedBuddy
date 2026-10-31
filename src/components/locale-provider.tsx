"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
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

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const dict: Dictionary = locale === "bn" ? bn : en;

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000`;
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(
        new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`)
      );
      if (m?.[1] === "bn" || m?.[1] === "en") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocaleState(m?.[1] as Locale);
      }
    }
  }, []);

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
