"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Counts = { players: number; teams: number; staff: number; sessions: number; matches: number; attendance: number };
type TopPlayer = { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null; attendance_pct: number; appearances: number };
type TeamStat = { id: string; name: string; category: string | null; players_count: number };

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({ players: 0, teams: 0, staff: 0, sessions: 0, matches: 0, attendance: 0 });
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [academyName, setAcademyName] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members")
        .select("academy_id, academies(name)")
        .eq("user_id", user.id)
        .limit(1);

      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const aid = members[0].academy_id;
      const aName = (members[0] as unknown as { academies: { name: string } }).academies?.name || "";
      setAcademyName(aName);

      const [p, t, s, ss, mm, att, players, teams, attRows] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("training_sessions").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("attendance").select("*", { count: "exact", head: true }),
        supabase.from("players").select("id, first_name, last_name, jersey_number, position").eq("academy_id", aid).eq("status", "active"),
        supabase.from("teams").select("id, name, category").eq("academy_id", aid),
        supabase.from("attendance").select("player_id, status").in("player_id", []),
      ]);

      setCounts({
        players: p.count || 0,
        teams: t.count || 0,
        staff: s.count || 0,
        sessions: ss.count || 0,
        matches: mm.count || 0,
        attendance: att.count || 0,
      });

      const allPlayers = players.data || [];
      const allTeams = teams.data || [];
      const playerIds = allPlayers.map((x) => x.id);

      let attendanceByPlayer: Record<string, { present: number; total: number }> = {};
      if (playerIds.length > 0) {
        const { data: attData } = await supabase
          .from("attendance")
          .select("player_id, status")
          .in("player_id", playerIds);
        (attData || []).forEach((row: { player_id: string; status: string }) => {
          if (!attendanceByPlayer[row.player_id]) attendanceByPlayer[row.player_id] = { present: 0, total: 0 };
          attendanceByPlayer[row.player_id].total++;
          if (row.status === "present" || row.status === "late") attendanceByPlayer[row.player_id].present++;
        });
      }

      const ranked = allPlayers
        .map((pl) => {
          const stats = attendanceByPlayer[pl.id] || { present: 0, total: 0 };
          const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
          return {
            id: pl.id,
            first_name: pl.first_name,
            last_name: pl.last_name,
            jersey_number: pl.jersey_number,
            position: pl.position,
            attendance_pct: pct,
            appearances: stats.total,
          };
        })
        .filter((p) => p.appearances > 0)
        .sort((a, b) => b.attendance_pct - a.attendance_pct)
        .slice(0, 5);
      setTopPlayers(ranked);

      setTeamStats(allTeams.map((t) => ({ id: t.id, name: t.name, category: t.category, players_count: 0 })));
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-sm text-muted-foreground">···</p></div>;
  }

  const cards = [
    { label: "اللاعبون", value: counts.players },
    { label: "الفرق", value: counts.teams },
    { label: "الطاقم", value: counts.staff },
    { label: "الجلسات", value: counts.sessions },
    { label: "المباريات", value: counts.matches },
    { label: "سجلات الحضور", value: counts.attendance },
  ];

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">التقارير</h1>
        <p className="mt-1 text-sm text-muted-foreground">نظرة شاملة على {academyName || "الأكاديمية"}</p>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">OVERVIEW</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-2 font-mono text-3xl font-light">{String(c.value).padStart(2, "0")}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">TOP ATTENDANCE</h2>
          <Link href="/dashboard/players" className="text-xs text-accent hover:underline">كل اللاعبين ←</Link>
        </div>
        {topPlayers.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">لا يوجد سجلات حضور بعد</p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-right text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">اللاعب</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium">المركز</th>
                  <th className="px-4 py-3 font-medium text-center">الحضور</th>
                  <th className="hidden md:table-cell px-4 py-3 font-medium text-center">الجلسات</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((p, i) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/players/${p.id}`} className="font-medium hover:text-accent">
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{p.position || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${p.attendance_pct}%` }} />
                        </div>
                        <span className="font-mono text-xs w-9 text-left">{p.attendance_pct}%</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-center text-muted-foreground font-mono">{p.appearances}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">TEAMS</h2>
          <Link href="/dashboard/teams" className="text-xs text-accent hover:underline">كل الفرق ←</Link>
        </div>
        {teamStats.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">لا يوجد فرق بعد</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {teamStats.map((t) => (
              <Link key={t.id} href={`/dashboard/teams/${t.id}`} className="rounded-xl border bg-card p-4 hover:border-primary/50 transition-colors">
                <p className="font-medium">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.category || "بدون فئة"}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
