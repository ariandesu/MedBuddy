import { useState, useEffect } from "react";
import en from "@/lib/i18n/en.json";
import bn from "@/lib/i18n/bn.json";
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "@/lib/i18n/index";
import type { Dictionary } from "@/lib/i18n";

export function useDictionary(): Dictionary {
  const [locale, setLocale] = useState<"bn" | "en">(DEFAULT_LOCALE);
  useEffect(() => {
    const m = document.cookie.match(
      new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`)
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale((m?.[1] === "bn" ? "bn" : "en") as "bn" | "en");
  }, []);
  return locale === "bn" ? bn : en;
}
