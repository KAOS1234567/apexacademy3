"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Team = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
  logo_url: string | null;
};

export default function TeamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members")
        .select("academy_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category, season, logo_url")
        .eq("academy_id", members[0].academy_id)
        .order("created_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }
      setTeams(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الفرق</h1>
          <p className="mt-1 text-sm text-muted-foreground">{teams.length} فريق</p>
        </div>
        <Link href="/dashboard/teams/new">
          <Button><Plus className="h-4 w-4" />إضافة فريق</Button>
        </Link>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">لا يوجد فرق بعد</h3>
          <p className="mb-6 text-sm text-muted-foreground">ابدأ بإنشاء أول فريق في أكاديميتك</p>
          <Link href="/dashboard/teams/new">
            <Button><Plus className="h-4 w-4" />إضافة فريق</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/teams/${t.id}`}
              className="rounded-2xl border bg-card p-5 transition hover:border-primary/50"
            >
              <div className="mb-3">
                {t.logo_url ? (
                  <img
                    src={t.logo_url}
                    alt={t.name}
                    className="h-14 w-14 rounded-xl object-cover border border-border"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold">{t.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.category || "بدون فئة"} • {t.season || "بدون موسم"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
