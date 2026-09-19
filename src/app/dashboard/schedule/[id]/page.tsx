"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, X, Clock, ShieldCheck, Trash2 } from "lucide-react";
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
  teams: { name: string } | null;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
};

type AttendanceStatus = "present" | "absent" | "late" | "excused";

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مبرر",
};

const STATUS_ICONS = {
  present: Check,
  absent: X,
  late: Clock,
  excused: ShieldCheck,
};

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

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: s, error: sErr } = await supabase
        .from("training_sessions")
        .select("*, teams(name)")
        .eq("id", id)
        .single();

      if (sErr || !s) { setLoading(false); return; }
      setSession(s as unknown as Session);

      // جيب لاعبين الفريق
      let playersQuery = supabase
        .from("players")
        .select("id, first_name, last_name, position, jersey_number")
        .eq("status", "active")
        .order("jersey_number", { ascending: true, nullsFirst: false });

      if (s.team_id) {
        playersQuery = playersQuery.eq("team_id", s.team_id);
        // ملاحظة: اللاعبين ما مرتبطين بفريق حالياً — نعرض كل اللاعبين
        // (الميزة راح تتحسن لاحقاً لما نضيف ربط لاعب-فريق)
      }

      const { data: ps } = await playersQuery;
      setPlayers(ps || []);

      const { data: existing } = await supabase
        .from("attendance")
        .select("player_id, status")
        .eq("session_id", id);

      const map: Record<string, AttendanceStatus> = {};
      (existing || []).forEach((a: { player_id: string; status: AttendanceStatus }) => {
        map[a.player_id] = a.status;
      });
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
      {
        session_id: id,
        player_id: playerId,
        status,
        recorded_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,player_id" }
    );

    if (!error) {
      setAttendance((prev) => ({ ...prev, [playerId]: status }));
    }
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

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  }

  if (!session) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">الجلسة غير موجودة</p>
        <Link href="/dashboard/schedule" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
      </div>
    );
  }

  const stats = {
    present: Object.values(attendance).filter((s) => s === "present").length,
    absent: Object.values(attendance).filter((s) => s === "absent").length,
    late: Object.values(attendance).filter((s) => s === "late").length,
    excused: Object.values(attendance).filter((s) => s === "excused").length,
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/schedule" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          رجوع للجدول
        </Link>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {session.title || session.teams?.name || "جلسة تدريب"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(session.session_date).toLocaleDateString("ar", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              {session.start_time && ` • ${session.start_time.slice(0, 5)}`}
              {session.end_time && ` — ${session.end_time.slice(0, 5)}`}
              {session.location && ` • ${session.location}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* إحصائيات */}
        <div className="mb-6 grid grid-cols-4 gap-2">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">حاضر</p>
            <p className="text-xl font-bold text-emerald-500">{stats.present}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">غائب</p>
            <p className="text-xl font-bold text-red-500">{stats.absent}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">متأخر</p>
            <p className="text-xl font-bold text-amber-500">{stats.late}</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">مبرر</p>
            <p className="text-xl font-bold text-blue-500">{stats.excused}</p>
          </div>
        </div>

        {/* قائمة اللاعبين */}
        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">لا يوجد لاعبين نشطين لتسجيل حضورهم</p>
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((p) => {
              const current = attendance[p.id];
              return (
                <div key={p.id} className="rounded-xl border bg-card p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {p.jersey_number != null && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold">
                          {p.jersey_number}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {p.first_name} {p.last_name}
                        </p>
                        {p.position && (
                          <p className="text-xs text-muted-foreground">{p.position}</p>
                        )}
                      </div>
                    </div>
                    {current && (
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px]",
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
    </div>
  );
}
