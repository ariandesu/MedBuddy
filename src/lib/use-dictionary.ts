import { useLocale } from "@/components/locale-provider";
import type { Dictionary } from "@/lib/i18n";

export function useDictionary(): Dictionary {
  return useLocale().dict;
}
