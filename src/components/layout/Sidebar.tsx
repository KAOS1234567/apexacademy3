"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Shield, Dumbbell, Calendar,
  Trophy, BarChart3, Settings, LogOut, X, Medal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "./LanguageToggle";

const nav = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, key: "home" },
  { href: "/dashboard/players", label: "اللاعبين", icon: Users, key: "players" },
  { href: "/dashboard/teams", label: "الفرق", icon: Shield, key: "teams" },
  { href: "/dashboard/staff", label: "المدربين", icon: Dumbbell, key: "staff" },
  { href: "/dashboard/schedule", label: "الجدول", icon: Calendar, key: "schedule" },
  { href: "/dashboard/matches", label: "المباريات", icon: Trophy, key: "matches" },
  { href: "/dashboard/leagues", label: "الدوريات", icon: Medal, key: "leagues" },
  { href: "/dashboard/reports", label: "التقارير", icon: BarChart3, key: "reports" },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings, key: "settings" },
];

export function Sidebar({
  onLogout,
  open,
  onClose,
  locale,
  dict,
}: {
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
  locale: string;
  dict: { nav: Record<string, string>; common: Record<string, string> };
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "flex h-full w-64 flex-col border-l bg-card transition-transform duration-300",
          "fixed inset-y-0 end-0 z-50 md:relative md:z-auto",
          open ? "translate-x-0" : "translate-x-full rtl:md:translate-x-0 ltr:md:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground font-bold">
              A
            </div>
            <span className="text-lg font-bold">{dict.common.appName}</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border/60 p-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>{dict.nav.logout}</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{dict.nav[item.key] || item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-3">
          <LanguageToggle current={locale} />
        </div>
      </aside>
    </>
  );
}
