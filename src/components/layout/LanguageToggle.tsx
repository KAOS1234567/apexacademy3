"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { LOCALES } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

export function LanguageToggle({ current }: { current: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function pick(code: string) {
    setOpen(false);
    setPending(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: code }),
      });
      router.refresh();
      window.location.reload();
    } catch {}
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        disabled={pending}
      >
        <Globe className="h-4 w-4" />
        <span className="flex-1 text-start">
          {LOCALES.find((l) => l.code === current)?.name || "العربية"}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 end-0 z-50 w-full min-w-[160px] rounded-lg border bg-card p-1 shadow-lg">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-start",
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
  );
}
