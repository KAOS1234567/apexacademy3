"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">مرحبًا بك 👋</h1>
        <p className="text-muted-foreground">
          أنت الآن مسجّل الدخول إلى Campo
        </p>
        <p className="text-sm text-muted-foreground">
          Dashboard قيد البناء — راح نبنيه قريبًا
        </p>
        <Button variant="outline" onClick={handleLogout}>
          تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
