import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "en", "es", "ckb"],
  defaultLocale: "ar",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  es: "Español",
  ckb: "کوردی",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  ar: "🇮🇶",
  en: "🇬🇧",
  es: "🇪🇸",
  ckb: "🏴",
};

export const RTL_LOCALES: Locale[] = ["ar", "ckb"];
