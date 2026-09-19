"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Shield, Dumbbell, Calendar, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Academy = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  currency: string;
};

type Membership = {
  role: string;
  academies: Academy;
};

type Counts = {
  players: number;
  teams: number;
  staff: number;
  sessions: number;
  matches: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [primary, setPrimary] = useState<Membership | null>(null);
  const [counts, setCounts] = useState<Counts>({
    players: 0, teams: 0, staff: 0, sessions: 0, matches: 0,
  });
  const [upcoming, setUpcoming] = useState<{ sessions: number; matches: number }>({ sessions: 0, matches: 0 });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      setUserEmail(user.email ?? null);

      const { data: members } = await supabase
        .from("academy_members")
        .select("role, academies(id, name, country, city, currency)")
        .eq("user_id", user.id);

      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const m = members[0] as unknown as Membership;
      setPrimary(m);
      const aid = m.academies.id;

      const [players, teams, staff, sessions, matches] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("training_sessions").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("academy_id", aid),
      ]);

      setCounts({
        players: players.count || 0,
        teams: teams.count || 0,
        staff: staff.count || 0,
        sessions: sessions.count || 0,
        matches: matches.count || 0,
      });

      const today = new Date().toISOString().split("T")[0];
      const [futureSessions, futureMatches] = await Promise.all([
        supabase.from("training_sessions").select("*", { count: "exact", head: true }).eq("academy_id", aid).gte("session_date", today),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("academy_id", aid).gte("match_date", today),
      ]);

      setUpcoming({
        sessions: futureSessions.count || 0,
        matches: futureMatches.count || 0,
      });

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

  if (!primary) return null;

  const cards = [
    { label: "اللاعبين", value: counts.players, icon: Users, href: "/dashboard/players" },
    { label: "الفرق", value: counts.teams, icon: Shield, href: "/dashboard/teams" },
    { label: "المدربين", value: counts.staff, icon: Dumbbell, href: "/dashboard/staff" },
    { label: "الجلسات", value: counts.sessions, icon: Calendar, href: "/dashboard/schedule" },
    { label: "المباريات", value: counts.matches, icon: Trophy, href: "/dashboard/matches" },
  ];

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">مرحبًا بك في</p>
        <h1 className="mt-1 text-3xl font-bold">{primary.academies.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {primary.academies.city && primary.academies.country
            ? `${primary.academies.city}، ${primary.academies.country}`
            : primary.academies.country || "—"}
          {" • "}
          دورك: <span className="font-medium text-foreground">{primary.role}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-2xl border bg-card p-5 transition hover:border-primary/50"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-bold">{c.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/schedule" className="rounded-2xl border bg-card p-6 transition hover:border-primary/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">جلسات تدريب قادمة</p>
              <p className="mt-1 text-3xl font-bold">{upcoming.sessions}</p>
            </div>
            <Calendar className="h-8 w-8 text-primary/40" />
          </div>
        </Link>
        <Link href="/dashboard/matches" className="rounded-2xl border bg-card p-6 transition hover:border-primary/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">مباريات قادمة</p>
              <p className="mt-1 text-3xl font-bold">{upcoming.matches}</p>
            </div>
            <Trophy className="h-8 w-8 text-primary/40" />
          </div>
        </Link>
      </div>
    </div>
  );
}
