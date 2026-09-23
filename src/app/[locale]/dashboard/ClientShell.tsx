"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export function ClientShell({
  children,
  isRTL,
}: {
  children: React.ReactNode;
  isRTL: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="flex h-screen w-full overflow-hidden">
      <Sidebar
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isRTL={isRTL}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Menu"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              A
            </div>
            <span className="font-bold">Campo</span>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
