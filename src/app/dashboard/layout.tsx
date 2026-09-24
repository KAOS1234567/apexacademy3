"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locale, setLocale] = useState("ar");
  const [dict, setDict] = useState<{ nav: Record<string, string>; common: Record<string, string> } | null>(null);

  useEffect(() => {
    fetch("/api/locale")
      .then((r) => r.json())
      .then((d) => { setLocale(d.locale); setDict(d.dict); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!dict) {
    return <div className="flex h-screen items-center justify-center"><p className="text-sm text-muted-foreground">···</p></div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar onLogout={handleLogout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} locale={locale} dict={dict} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground text-xs font-bold">A</div>
            <span className="font-bold">{dict.common.appName}</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
