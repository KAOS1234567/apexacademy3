"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Academy = { id: string; name: string; country: string | null; city: string | null; currency: string };
type Membership = { role: string; academies: Academy };
type Counts = { players: number; teams: number; staff: number; sessions: number; matches: number };

const STAT_META = [
  { key: "players", label: "لاعب", en: "PLAYERS", href: "/dashboard/players" },
  { key: "teams", label: "فريق", en: "TEAMS", href: "/dashboard/teams" },
  { key: "staff", label: "مدرب", en: "STAFF", href: "/dashboard/staff" },
  { key: "sessions", label: "جلسة", en: "SESSIONS", href: "/dashboard/schedule" },
  { key: "matches", label: "مباراة", en: "MATCHES", href: "/dashboard/matches" },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [primary, setPrimary] = useState<Membership | null>(null);
  const [counts, setCounts] = useState<Counts>({ players: 0, teams: 0, staff: 0, sessions: 0, matches: 0 });
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

      const [p, t, s, ss, mm] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("training_sessions").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("academy_id", aid),
      ]);

      setCounts({
        players: p.count || 0, teams: t.count || 0, staff: s.count || 0,
        sessions: ss.count || 0, matches: mm.count || 0,
      });

      const today = new Date().toISOString().split("T")[0];
      const [fs, fm] = await Promise.all([
        supabase.from("training_sessions").select("*", { count: "exact", head: true }).eq("academy_id", aid).gte("session_date", today),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("academy_id", aid).gte("match_date", today),
      ]);
      setUpcoming({ sessions: fs.count || 0, matches: fm.count || 0 });
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  }
  if (!primary) return null;

  const total = counts.players + counts.teams + counts.staff + counts.sessions + counts.matches;

  return (
    <div className="min-h-full">
      {/* Hero - العنوان الكبير */}
      <div className="border-b border-border/50 bg-gradient-to-l from-transparent via-primary/5 to-primary/10 px-6 py-10 md:px-12 md:py-14">
        <div className="flex items-center gap-3 text-xs tracking-[0.3em] text-accent">
          <span className="h-px w-8 bg-accent" />
          <span className="font-mono">ACADEMY</span>
        </div>
        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
          {primary.academies.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>{primary.academies.city && primary.academies.country ? `${primary.academies.city}، ${primary.academies.country}` : primary.academies.country || "—"}</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span>دورك: <span className="text-foreground">{primary.role}</span></span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
          <span className="font-mono text-xs">{userEmail}</span>
        </div>
      </div>

      {/* شريط الأرقام - Editorial */}
      <div className="grid grid-cols-2 border-b border-border/50 md:grid-cols-5">
        {STAT_META.map((s, i) => (
          <Link
            key={s.key}
            href={s.href}
            className={`group relative flex flex-col justify-between px-6 py-8 transition-colors hover:bg-card md:px-8 md:py-10 ${i < 4 ? "md:border-l md:border-border/50" : ""} ${i < 4 ? "border-b md:border-b-0" : ""} ${i % 2 === 0 && i < 4 ? "border-l md:border-l" : ""}`}
          >
            <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground/70">
              {s.en}
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold leading-none md:text-5xl">
                {String(counts[s.key]).padStart(2, "0")}
              </span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <span className="absolute bottom-0 right-6 h-0.5 w-0 bg-accent transition-all duration-300 group-hover:w-12 md:right-8" />
          </Link>
        ))}
      </div>

      {/* قسمين - قادم */}
      <div className="grid md:grid-cols-2">
        <Link href="/dashboard/schedule" className="group border-b border-border/50 px-6 py-10 transition-colors hover:bg-card md:border-b-0 md:border-l md:px-12 md:py-14">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground/70">UPCOMING</span>
              <p className="mt-3 text-sm text-muted-foreground">جلسات تدريب قادمة</p>
              <p className="mt-2 font-mono text-6xl font-bold md:text-7xl">{String(upcoming.sessions).padStart(2, "0")}</p>
            </div>
            <span className="text-4xl text-accent/40 transition-transform group-hover:-translate-x-1">→</span>
          </div>
        </Link>
        <Link href="/dashboard/matches" className="group px-6 py-10 transition-colors hover:bg-card md:px-12 md:py-14">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground/70">FIXTURES</span>
              <p className="mt-3 text-sm text-muted-foreground">مباريات قادمة</p>
              <p className="mt-2 font-mono text-6xl font-bold md:text-7xl">{String(upcoming.matches).padStart(2, "0")}</p>
            </div>
            <span className="text-4xl text-accent/40 transition-transform group-hover:-translate-x-1">→</span>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 px-6 py-6 md:px-12">
        <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground/60">
          CAMPO · FOOTBALL OPERATIONS · TOTAL {String(total).padStart(2, "0")}
        </p>
      </div>
    </div>
  );
}
