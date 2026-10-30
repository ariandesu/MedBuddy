import en from "./en.json";
import bn from "./bn.json";

export type Locale = "bn" | "en";
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, bn };

export const DEFAULT_LOCALE: Locale = "bn";
export const LOCALE_COOKIE = "medisathi-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "bn" || value === "en";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
