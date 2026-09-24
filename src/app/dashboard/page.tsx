"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Academy = { id: string; name: string; country: string | null; city: string | null };
type Membership = { role: string; academies: Academy };
type Counts = { players: number; teams: number; staff: number; sessions: number; matches: number };
type NextSession = { id: string; title: string | null; session_date: string; start_time: string | null; location: string | null; teams: { name: string } | null };
type NextMatch = { id: string; opponent: string; match_date: string; match_time: string | null; venue: string | null; teams: { name: string } | null };
type Activity = { id: string; type: string; label: string; sub: string; date: string; href: string };
type AttendanceStats = { present: number; absent: number; late: number; excused: number; total: number };

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [primary, setPrimary] = useState<Membership | null>(null);
  const [counts, setCounts] = useState<Counts>({ players: 0, teams: 0, staff: 0, sessions: 0, matches: 0 });
  const [nextSession, setNextSession] = useState<NextSession | null>(null);
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attStats, setAttStats] = useState<AttendanceStats>({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members")
        .select("role, academies(id, name, country, city)")
        .eq("user_id", user.id);

      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const m = members[0] as unknown as Membership;
      setPrimary(m);
      const aid = m.academies.id;
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [p, t, s, ss, mm, ns, nm, recentPlayers, recentTeams, recentSessions, recentMatches, attRows] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("training_sessions").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("training_sessions").select("id, title, session_date, start_time, location, teams(name)").eq("academy_id", aid).gte("session_date", today).order("session_date", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("matches").select("id, opponent, match_date, match_time, venue, teams(name)").eq("academy_id", aid).gte("match_date", today).order("match_date", { ascending: true }).limit(1).maybeSingle(),
        supabase.from("players").select("id, first_name, last_name, created_at").eq("academy_id", aid).order("created_at", { ascending: false }).limit(3),
        supabase.from("teams").select("id, name, created_at").eq("academy_id", aid).order("created_at", { ascending: false }).limit(3),
        supabase.from("training_sessions").select("id, title, session_date, created_at, teams(name)").eq("academy_id", aid).order("created_at", { ascending: false }).limit(3),
        supabase.from("matches").select("id, opponent, match_date, created_at, teams(name)").eq("academy_id", aid).order("created_at", { ascending: false }).limit(3),
        supabase.from("attendance").select("status, training_sessions!inner(session_date, academy_id)").eq("training_sessions.academy_id", aid).gte("training_sessions.session_date", thirtyDaysAgo),
      ]);

      setCounts({
        players: p.count || 0, teams: t.count || 0, staff: s.count || 0,
        sessions: ss.count || 0, matches: mm.count || 0,
      });
      setNextSession(ns.data as unknown as NextSession);
      setNextMatch(nm.data as unknown as NextMatch);

      // Activities
      const acts: Activity[] = [];
      (recentPlayers.data || []).forEach((x: { id: string; first_name: string; last_name: string; created_at: string }) => {
        acts.push({ id: `pl-${x.id}`, type: "player", label: "لاعب جديد", sub: `${x.first_name} ${x.last_name}`, date: x.created_at, href: `/dashboard/players/${x.id}` });
      });
      (recentTeams.data || []).forEach((x: { id: string; name: string; created_at: string }) => {
        acts.push({ id: `tm-${x.id}`, type: "team", label: "فريق جديد", sub: x.name, date: x.created_at, href: `/dashboard/teams/${x.id}` });
      });
      (recentSessions.data || []).forEach((x: { id: string; title: string | null; session_date: string; created_at: string; teams: { name: string } | null }) => {
        acts.push({ id: `ss-${x.id}`, type: "session", label: "جلسة تدريب", sub: x.title || x.teams?.name || "جلسة", date: x.created_at, href: `/dashboard/schedule/${x.id}` });
      });
      (recentMatches.data || []).forEach((x: { id: string; opponent: string; match_date: string; created_at: string; teams: { name: string } | null }) => {
        acts.push({ id: `mt-${x.id}`, type: "match", label: "مباراة", sub: `${x.teams?.name || "فريقنا"} × ${x.opponent}`, date: x.created_at, href: `/dashboard/matches/${x.id}` });
      });
      acts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivities(acts.slice(0, 6));

      // Attendance stats
      const rows = (attRows.data || []) as { status: string }[];
      const stats: AttendanceStats = { present: 0, absent: 0, late: 0, excused: 0, total: rows.length };
      rows.forEach((r) => {
        if (r.status === "present") stats.present++;
        else if (r.status === "absent") stats.absent++;
        else if (r.status === "late") stats.late++;
        else if (r.status === "excused") stats.excused++;
      });
      setAttStats(stats);

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground text-sm">···</p></div>;
  }
  if (!primary) return null;

  const now = new Date();
  const dayName = DAYS_AR[now.getDay()];
  const dayNum = now.getDate();
  const monthName = MONTHS_AR[now.getMonth()];
  const year = now.getFullYear();

  const attendanceRate = attStats.total > 0 ? Math.round(((attStats.present + attStats.late) / attStats.total) * 100) : 0;

  const stats = [
    { label: "لاعب", en: "PLAYERS", val: counts.players, href: "/dashboard/players" },
    { label: "فريق", en: "TEAMS", val: counts.teams, href: "/dashboard/teams" },
    { label: "مدرب", en: "STAFF", val: counts.staff, href: "/dashboard/staff" },
    { label: "جلسة", en: "SESSIONS", val: counts.sessions, href: "/dashboard/schedule" },
    { label: "مباراة", en: "MATCHES", val: counts.matches, href: "/dashboard/matches" },
  ];

  const activityIcon = (type: string) => {
    if (type === "player") return "⚽";
    if (type === "team") return "🛡";
    if (type === "session") return "📅";
    if (type === "match") return "🏆";
    return "•";
  };

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} س`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `منذ ${days} يوم`;
    return d.toLocaleDateString("ar");
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="border-b border-border/60 px-6 md:px-10 py-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.35em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>CAMPO · DRESSING ROOM</span>
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold leading-tight truncate">
            {primary.academies.name}
          </h1>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="font-mono text-3xl font-light leading-none">{dayNum}</span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{monthName} · {dayName}</span>
        </div>
      </header>

      {/* Stats strip */}
      <section className="grid grid-cols-5 border-b border-border/60 w-full">
        {stats.map((s, i) => (
          <Link
            key={s.en}
            href={s.href}
            className={`group min-w-0 px-1 md:px-6 py-4 md:py-8 text-center hover:bg-card/40 transition-colors ${i > 0 ? "border-r border-border/60" : ""}`}
          >
            <div className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground/60 mb-2">{s.en}</div>
            <div className="font-mono text-2xl md:text-4xl font-light leading-none group-hover:text-accent transition-colors">
              {String(s.val).padStart(2, "0")}
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </section>

      <div className="grid md:grid-cols-[1fr_360px]">
        {/* Left — Next events + Attendance */}
        <div className="border-b md:border-b-0 md:border-l border-border/60">
          {/* Next Session */}
          <section className="border-b border-border/60 px-6 py-7 md:px-10 md:py-9">
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70">NEXT SESSION</span>
              <Link href="/dashboard/schedule" className="text-xs text-accent hover:underline">الجدول ←</Link>
            </div>
            {nextSession ? (
              <Link href={`/dashboard/schedule/${nextSession.id}`} className="block group">
                <div className="text-xl md:text-2xl font-bold group-hover:text-accent transition-colors leading-tight">
                  {nextSession.title || nextSession.teams?.name || "جلسة"}
                </div>
                <div className="mt-2 font-mono text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  <span>{nextSession.session_date}</span>
                  {nextSession.start_time && <span>{nextSession.start_time.slice(0, 5)}</span>}
                  {nextSession.location && <span>· {nextSession.location}</span>}
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">— لا يوجد جلسات قادمة —</p>
            )}
          </section>

          {/* Next Match */}
          <section className="border-b border-border/60 px-6 py-7 md:px-10 md:py-9">
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70">NEXT FIXTURE</span>
              <Link href="/dashboard/matches" className="text-xs text-accent hover:underline">المباريات ←</Link>
            </div>
            {nextMatch ? (
              <Link href={`/dashboard/matches/${nextMatch.id}`} className="block group">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground">{nextMatch.teams?.name || "فريقنا"}</span>
                  <span className="font-mono text-lg text-accent">×</span>
                  <span className="text-xl md:text-2xl font-bold group-hover:text-accent transition-colors">{nextMatch.opponent}</span>
                </div>
                <div className="mt-2 font-mono text-xs text-muted-foreground flex flex-wrap gap-x-3">
                  <span>{nextMatch.match_date}</span>
                  {nextMatch.match_time && <span>{nextMatch.match_time.slice(0, 5)}</span>}
                  {nextMatch.venue && <span>· {nextMatch.venue === "home" ? "HOME" : nextMatch.venue === "away" ? "AWAY" : "NEUTRAL"}</span>}
                </div>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">— لا يوجد مباريات قادمة —</p>
            )}
          </section>

          {/* Attendance Overview (last 30 days) */}
          <section className="px-6 py-7 md:px-10 md:py-9">
            <div className="flex items-baseline justify-between mb-5">
              <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70">ATTENDANCE · 30 DAYS</span>
              <Link href="/dashboard/reports" className="text-xs text-accent hover:underline">التقارير ←</Link>
            </div>

            {attStats.total === 0 ? (
              <p className="text-sm text-muted-foreground">— لا يوجد سجلات حضور —</p>
            ) : (
              <>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-mono text-4xl font-light">{attendanceRate}%</span>
                  <span className="text-xs text-muted-foreground">من {attStats.total} سجل</span>
                </div>

                {/* progress bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-5">
                  <div className="h-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} />
                </div>

                {/* breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-mono text-lg font-light text-emerald-500">{attStats.present}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">حاضر</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-mono text-lg font-light text-red-500">{attStats.absent}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">غائب</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-mono text-lg font-light text-amber-500">{attStats.late}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">متأخر</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3">
                    <p className="font-mono text-lg font-light text-blue-500">{attStats.excused}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">مبرر</p>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right — Activity Feed */}
        <aside className="px-6 py-7 md:px-8 md:py-9">
          <div className="flex items-baseline justify-between mb-5">
            <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70">RECENT ACTIVITY</span>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">— لا يوجد نشاطات —</p>
          ) : (
            <div className="space-y-1">
              {activities.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className="flex items-start gap-3 py-3 border-b border-border/40 last:border-b-0 group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-sm">
                    {activityIcon(a.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                      {a.label}
                    </p>
                    <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                      {a.sub}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                    {timeAgo(a.date)}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Role card */}
          <div className="mt-8 pt-6 border-t border-border/60">
            <div className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground/70 mb-3">ROLE</div>
            <div className="text-xl font-bold uppercase tracking-wide">{primary.role}</div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              {primary.academies.city && `${primary.academies.city}، `}{primary.academies.country || "—"}
            </div>
          </div>
        </aside>
      </div>

      <footer className="border-t border-border/60 px-6 md:px-10 py-5 flex items-center justify-between">
        <p className="font-mono text-[9px] tracking-[0.35em] text-muted-foreground/50 uppercase">CAMPO · {year}</p>
        <p className="font-mono text-[9px] tracking-[0.35em] text-muted-foreground/50 uppercase">FOOTBALL OPERATIONS</p>
      </footer>
    </div>
  );
}
