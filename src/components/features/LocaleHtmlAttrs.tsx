"use client";

import { useEffect } from "react";

const RTL = ["ar", "ckb"];

export function LocaleHtmlAttrs({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    const dir = RTL.includes(locale) ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.setAttribute("data-dir", dir);
  }, [locale]);
  return null;
}
