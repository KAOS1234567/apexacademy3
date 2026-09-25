"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Locale } from "./dictionaries";
import { translate } from "./tr";

type Dict = typeof dictionaries.ar;

const DictContext = createContext<{
  locale: Locale;
  dict: Dict;
  tr: (key: string) => string;
}>({
  locale: "ar",
  dict: dictionaries.ar,
  tr: (k) => k,
});

export function DictProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  const tr = (key: string) => translate(key, locale);
  return <DictContext.Provider value={{ locale, dict, tr }}>{children}</DictContext.Provider>;
}

export function useDict() {
  return useContext(DictContext);
}
