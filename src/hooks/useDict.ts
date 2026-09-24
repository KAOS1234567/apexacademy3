"use client";

import { useEffect, useState } from "react";
import { dictionaries, type Locale } from "@/i18n/dictionaries";

type Dict = typeof dictionaries.ar;

export function useDict() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [dict, setDict] = useState<Dict>(dictionaries.ar);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/locale")
      .then((r) => r.json())
      .then((d) => {
        const lc = (d.locale || "ar") as Locale;
        setLocale(lc);
        setDict(dictionaries[lc]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { locale, dict, loading };
}
