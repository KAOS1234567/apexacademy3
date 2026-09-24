"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Locale } from "./dictionaries";

type Dict = typeof dictionaries.ar;

const DictContext = createContext<{ locale: Locale; dict: Dict }>({
  locale: "ar",
  dict: dictionaries.ar,
});

export function DictProvider({ locale, dict, children }: { locale: Locale; dict: Dict; children: React.ReactNode }) {
  return <DictContext.Provider value={{ locale, dict }}>{children}</DictContext.Provider>;
}

export function useDict() {
  return useContext(DictContext);
}
