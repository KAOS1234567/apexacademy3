import { cookies } from "next/headers";
import { dictionaries, getDirection, type Locale } from "./dictionaries";

export type { Locale } from "./dictionaries";
export { LOCALES, dictionaries, getDirection } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get("locale")?.value as Locale | undefined;
  if (v && ["ar", "ku", "en", "es"].includes(v)) return v;
  return "ar";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, dir: getDirection(locale), t: dictionaries[locale] };
}
