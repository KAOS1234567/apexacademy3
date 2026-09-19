"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Counts = { players: number; teams: number; staff: number; sessions: number; matches: number; attendance: number };
type TopPlayer = { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null; attendance_pct: number; appearances: number };
type TeamStat = { id: string; name: string; category: string | null };
type PlayerRow = { first_name: string; last_name: string; position: string | null; jersey_number: number | null; status: string };

export default function PrintReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [academyName, setAcademyName] = useState("");
  const [counts, setCounts] = useState<Counts>({ players: 0, teams: 0, staff: 0, sessions: 0, matches: 0, attendance: 0 });
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerRow[]>([]);

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
      setAcademyName((members[0] as unknown as { academies: { name: string } }).academies?.name || "");

      const [p, t, s, ss, mm, att, players, teams] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("teams").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("staff").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("training_sessions").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("academy_id", aid),
        supabase.from("attendance").select("*", { count: "exact", head: true }),
        supabase.from("players").select("id, first_name, last_name, jersey_number, position").eq("academy_id", aid).eq("status", "active").order("jersey_number", { ascending: true, nullsFirst: false }),
        supabase.from("teams").select("id, name, category").eq("academy_id", aid),
      ]);

      setCounts({
        players: p.count || 0, teams: t.count || 0, staff: s.count || 0,
        sessions: ss.count || 0, matches: mm.count || 0, attendance: att.count || 0,
      });

      const allP = (players.data || []) as { id: string; first_name: string; last_name: string; jersey_number: number | null; position: string | null }[];
      const allT = teams.data || [];
      const playerIds = allP.map((x) => x.id);

      const abp: Record<string, { present: number; total: number }> = {};
      if (playerIds.length > 0) {
        const { data: attData } = await supabase.from("attendance").select("player_id, status").in("player_id", playerIds);
        (attData || []).forEach((row: { player_id: string; status: string }) => {
          if (!abp[row.player_id]) abp[row.player_id] = { present: 0, total: 0 };
          abp[row.player_id].total++;
          if (row.status === "present" || row.status === "late") abp[row.player_id].present++;
        });
      }

      const ranked = allP
        .map((pl) => {
          const st = abp[pl.id] || { present: 0, total: 0 };
          const pct = st.total > 0 ? Math.round((st.present / st.total) * 100) : 0;
          return { id: pl.id, first_name: pl.first_name, last_name: pl.last_name, jersey_number: pl.jersey_number, position: pl.position, attendance_pct: pct, appearances: st.total };
        })
        .filter((x) => x.appearances > 0)
        .sort((a, b) => b.attendance_pct - a.attendance_pct)
        .slice(0, 5);
      setTopPlayers(ranked);

      setAllPlayers(allP.map((pl) => ({
        first_name: pl.first_name,
        last_name: pl.last_name,
        position: pl.position,
        jersey_number: pl.jersey_number,
        status: "active",
      })));

      setTeamStats(allT.map((x) => ({ id: x.id, name: x.name, category: x.category })));
      setLoading(false);

      // بعد ما يخلص التحميل - افتح نافذة الطباعة تلقائيًا
      setTimeout(() => { window.print(); }, 600);
    }
    load();
  }, [router]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui" }}>جاري التحميل...</div>;
  }

  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

  return (
    <div className="print-page">
      {/* زر الطباعة - يختفي عند الطباعة */}
      <div className="no-print print-toolbar">
        <button className="print-btn" onClick={() => window.print()}>
          <Printer size={16} />
          طباعة / حفظ PDF
        </button>
        <a className="print-link" onClick={() => router.back()}>رجوع</a>
      </div>

      {/* Header */}
      <header className="report-header">
        <div className="report-brand">
          <div className="report-logo">C</div>
          <div className="report-brand-text">
            <div className="report-brand-name">CAMPO</div>
            <div className="report-brand-sub">Football Operations</div>
          </div>
        </div>
        <div className="report-meta">
          <div className="report-meta-line">التاريخ: {dateStr}</div>
          <div className="report-meta-line">أكاديمية: {academyName || "—"}</div>
        </div>
      </header>

      <div className="report-title-block">
        <h1 className="report-title">التقرير الشهري</h1>
        <div className="report-title-line" />
      </div>

      {/* Overview */}
      <section className="report-section">
        <h2 className="report-h2">نظرة عامة</h2>
        <div className="report-stats">
          <div className="report-stat">
            <span className="report-stat-label">اللاعبون</span>
            <span className="report-stat-value">{String(counts.players).padStart(2, "0")}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">الفرق</span>
            <span className="report-stat-value">{String(counts.teams).padStart(2, "0")}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">الطاقم</span>
            <span className="report-stat-value">{String(counts.staff).padStart(2, "0")}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">الجلسات</span>
            <span className="report-stat-value">{String(counts.sessions).padStart(2, "0")}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">المباريات</span>
            <span className="report-stat-value">{String(counts.matches).padStart(2, "0")}</span>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">سجلات الحضور</span>
            <span className="report-stat-value">{String(counts.attendance).padStart(2, "0")}</span>
          </div>
        </div>
      </section>

      {/* Top Attendance */}
      <section className="report-section">
        <h2 className="report-h2">أعلى نسبة حضور</h2>
        {topPlayers.length === 0 ? (
          <p className="report-empty">— لا يوجد سجلات حضور بعد —</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>اللاعب</th>
                <th>المركز</th>
                <th style={{ width: 90, textAlign: "center" }}>الحضور</th>
                <th style={{ width: 70, textAlign: "center" }}>الجلسات</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.map((p, i) => (
                <tr key={p.id}>
                  <td>{String(i + 1).padStart(2, "0")}</td>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.position || "—"}</td>
                  <td style={{ textAlign: "center" }}>{p.attendance_pct}%</td>
                  <td style={{ textAlign: "center" }}>{p.appearances}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* All Players */}
      <section className="report-section">
        <h2 className="report-h2">قائمة اللاعبين</h2>
        {allPlayers.length === 0 ? (
          <p className="report-empty">— لا يوجد لاعبون —</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>الرقم</th>
                <th>الاسم</th>
                <th>المركز</th>
              </tr>
            </thead>
            <tbody>
              {allPlayers.map((p, i) => (
                <tr key={i}>
                  <td>{p.jersey_number ?? "—"}</td>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.position || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Teams */}
      <section className="report-section">
        <h2 className="report-h2">الفرق</h2>
        {teamStats.length === 0 ? (
          <p className="report-empty">— لا يوجد فرق —</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>اسم الفريق</th>
                <th style={{ width: 120 }}>الفئة</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.category || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="report-footer">
        <span>Campo · Football Operations</span>
        <span>{dateStr}</span>
      </footer>
    </div>
  );
}
