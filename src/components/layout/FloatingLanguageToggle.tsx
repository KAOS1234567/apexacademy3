"use client";

import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALES } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

export function FloatingLanguageToggle({ current }: { current: string }) {
  const [open, setOpen] = useState(false);

  function pick(code: string) {
    document.cookie = `locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    const url = new URL(window.location.href);
    url.searchParams.set("_lang", Date.now().toString());
    window.location.href = url.toString();
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-full border border-accent/40 bg-card px-3 py-2 text-sm shadow-lg hover:border-accent"
        >
          <Globe className="h-4 w-4 text-accent" />
          <span className="font-medium">{LOCALES.find((l) => l.code === current)?.name || "العربية"}</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full mt-2 right-0 z-50 min-w-[180px] rounded-lg border bg-card p-1 shadow-xl">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => pick(l.code)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-start",
                    l.code === current ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="text-base">{l.flag}</span>
                  <span className="flex-1">{l.name}</span>
                  {l.code === current && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
