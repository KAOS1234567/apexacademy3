"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, X, Clock, ShieldCheck, Trash2, Calendar, MapPin, Users, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  title: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  team_id: string | null;
  teams: { name: string; logo_url: string | null; category: string | null } | null;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
  photo_url: string | null;
};

type AttendanceStatus = "present" | "absent" | "late" | "excused";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر", absent: "غائب", late: "متأخر", excused: "مبرر",
};

const STATUS_ICONS = { present: Check, absent: X, late: Clock, excused: ShieldCheck };

type Tab = "overview" | "attendance";

export default function SessionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: s, error: sErr } = await supabase.from("training_sessions").select("*, teams(name, logo_url, category)").eq("id", id).single();
      if (sErr || !s) { setLoading(false); return; }
      setSession(s as unknown as Session);

      let playersQuery = supabase.from("players").select("id, first_name, last_name, position, jersey_number, photo_url").eq("status", "active").order("jersey_number", { ascending: true, nullsFirst: false });
      if (s.team_id) playersQuery = playersQuery.eq("team_id", s.team_id);
      const { data: ps } = await playersQuery;
      setPlayers((ps as Player[]) || []);

      const { data: existing } = await supabase.from("attendance").select("player_id, status").eq("session_id", id);
      const map: Record<string, AttendanceStatus> = {};
      (existing || []).forEach((a: { player_id: string; status: AttendanceStatus }) => { map[a.player_id] = a.status; });
      setAttendance(map);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function setStatus(playerId: string, status: AttendanceStatus) {
    setSavingId(playerId);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("attendance").upsert(
      { session_id: id, player_id: playerId, status, recorded_by: user?.id, updated_at: new Date().toISOString() },
      { onConflict: "session_id,player_id" }
    );
    if (!error) setAttendance((prev) => ({ ...prev, [playerId]: status }));
    setSavingId(null);
  }

  async function handleDelete() {
    if (!confirm("حذف هذه الجلسة؟")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("training_sessions").delete().eq("id", id);
    router.push("/dashboard/schedule");
    router.refresh();
  }

  if (loading) return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  if (!session) return (
    <div className="p-10 text-center">
      <p className="text-muted-foreground">الجلسة غير موجودة</p>
      <Link href="/dashboard/schedule" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
    </div>
  );

  const stats = {
    present: Object.values(attendance).filter((s) => s === "present").length,
    absent: Object.values(attendance).filter((s) => s === "absent").length,
    late: Object.values(attendance).filter((s) => s === "late").length,
    excused: Object.values(attendance).filter((s) => s === "excused").length,
  };
  const totalMarked = stats.present + stats.absent + stats.late + stats.excused;
  const attendanceRate = totalMarked > 0 ? Math.round(((stats.present + stats.late) / totalMarked) * 100) : 0;
  const notMarked = players.length - totalMarked;

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/schedule" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للجدول
        </Link>

        {/* Hero */}
        <div className="mb-6 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/15 flex items-center justify-center shrink-0" style={{ width: 64, height: 64 }}>
              <Calendar className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold truncate">
                {session.title || session.teams?.name || "جلسة تدريب"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground font-mono">
                {new Date(session.session_date).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {session.start_time && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono">{session.start_time.slice(0, 5)}{session.end_time && ` — ${session.end_time.slice(0, 5)}`}</span>
                  </span>
                )}
                {session.location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
                    <MapPin className="h-3 w-3" />
                    {session.location}
                  </span>
                )}
                {session.teams && (
                  <Link href={`/dashboard/teams/${session.team_id}`} className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 hover:border-accent transition-colors">
                    {session.teams.logo_url ? (
                      <img src={session.teams.logo_url} alt={session.teams.name} style={{ width: 16, height: 16, objectFit: "cover" }} className="rounded" />
                    ) : (
                      <Users className="h-3 w-3" />
                    )}
                    <span>{session.teams.name}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 border-b border-border/60">
          <button onClick={() => setTab("overview")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "overview" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <BarChart3 className="inline h-4 w-4 ml-1" />نظرة عامة
          </button>
          <button onClick={() => setTab("attendance")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "attendance" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Check className="inline h-4 w-4 ml-1" />تسجيل الحضور
          </button>
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="font-mono text-3xl font-light text-emerald-500">{stats.present}</p>
                <p className="mt-1 text-xs text-muted-foreground">حاضر</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="font-mono text-3xl font-light text-red-500">{stats.absent}</p>
                <p className="mt-1 text-xs text-muted-foreground">غائب</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="font-mono text-3xl font-light text-amber-500">{stats.late}</p>
                <p className="mt-1 text-xs text-muted-foreground">متأخر</p>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center">
                <p className="font-mono text-3xl font-light text-blue-500">{stats.excused}</p>
                <p className="mt-1 text-xs text-muted-foreground">مبرر</p>
              </div>
            </div>

            {/* Attendance rate */}
            <div className="rounded-2xl border bg-card p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">نسبة الحضور</p>
                  <p className="mt-1 font-mono text-4xl font-light">{attendanceRate}%</p>
                </div>
                <div className="text-left text-xs text-muted-foreground">
                  <p>اللاعبون: {players.length}</p>
                  <p>تم تسجيل: {totalMarked}</p>
                  {notMarked > 0 && <p className="text-amber-500">بدون تسجيل: {notMarked}</p>}
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${attendanceRate}%` }} />
              </div>
            </div>

            {/* Notes */}
            {session.notes && (
              <section>
                <h2 className="mb-3 text-sm font-mono uppercase tracking-wider text-muted-foreground">NOTES</h2>
                <div className="rounded-2xl border bg-card p-4">
                  <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
                </div>
              </section>
            )}

            {/* Quick action */}
            <div className="flex gap-3">
              <Button onClick={() => setTab("attendance")}>
                <Check className="h-4 w-4" />
                {totalMarked === 0 ? "ابدأ تسجيل الحضور" : "تعديل الحضور"}
              </Button>
            </div>
          </div>
        )}

        {tab === "attendance" && (
          <div>
            {players.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {session.team_id ? "لا يوجد لاعبون في هذا الفريق" : "هذه الجلسة بدون فريق — أضف لاعبين أولاً"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((p) => {
                  const current = attendance[p.id];
                  return (
                    <div key={p.id} className="rounded-xl border bg-card p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {p.jersey_number != null && (
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-mono font-bold shrink-0">
                              {p.jersey_number}
                            </span>
                          )}
                          {p.photo_url ? (
                            <img src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} style={{ width: 32, height: 32, objectFit: "cover" }} className="rounded-full border shrink-0" />
                          ) : (
                            <div className="rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0" style={{ width: 32, height: 32 }}>
                              {p.first_name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.first_name} {p.last_name}</p>
                            {p.position && <p className="text-xs text-muted-foreground truncate">{p.position}</p>}
                          </div>
                        </div>
                        {current && (
                          <span className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] shrink-0",
                            current === "present" && "bg-emerald-500/15 text-emerald-500",
                            current === "absent" && "bg-red-500/15 text-red-500",
                            current === "late" && "bg-amber-500/15 text-amber-500",
                            current === "excused" && "bg-blue-500/15 text-blue-500"
                          )}>
                            {STATUS_LABELS[current]}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(Object.keys(STATUS_LABELS) as AttendanceStatus[]).map((s) => {
                          const Icon = STATUS_ICONS[s];
                          const active = current === s;
                          const disabled = savingId === p.id;
                          return (
                            <button
                              key={s}
                              onClick={() => setStatus(p.id, s)}
                              disabled={disabled}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-lg border py-2 text-[10px] transition-colors",
                                active && s === "present" && "border-emerald-500/50 bg-emerald-500/15 text-emerald-500",
                                active && s === "absent" && "border-red-500/50 bg-red-500/15 text-red-500",
                                active && s === "late" && "border-amber-500/50 bg-amber-500/15 text-amber-500",
                                active && s === "excused" && "border-blue-500/50 bg-blue-500/15 text-blue-500",
                                !active && "text-muted-foreground hover:bg-muted hover:text-foreground",
                                disabled && "opacity-50"
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {STATUS_LABELS[s]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />{deleting ? "جاري الحذف..." : "حذف الجلسة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
