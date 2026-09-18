"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type Row = {
  status: AttendanceStatus;
  session: {
    id: string;
    session_date: string;
    title: string | null;
    teams: { name: string } | null;
  };
};

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

export function PlayerAttendance({ playerId }: { playerId: string }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("attendance")
        .select("status, session:training_sessions(id, session_date, title, teams(name))")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(20);

      setRows((data as unknown) as Row[] || []);
      setLoading(false);
    }
    load();
  }, [playerId]);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">لا يوجد سجل حضور بعد</p>
      </div>
    );
  }

  const totals = {
    present: rows.filter((r) => r.status === "present").length,
    absent: rows.filter((r) => r.status === "absent").length,
    late: rows.filter((r) => r.status === "late").length,
    excused: rows.filter((r) => r.status === "excused").length,
  };
  const attendanceRate =
    rows.length > 0
      ? Math.round(((totals.present + totals.late) / rows.length) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* ملخص */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">نسبة الحضور</p>
            <p className="text-3xl font-bold">{attendanceRate}%</p>
          </div>
          <div className="text-left text-xs text-muted-foreground">
            <p>إجمالي الجلسات: {rows.length}</p>
            <p className="mt-1 text-emerald-500">حاضر: {totals.present}</p>
            <p className="text-red-500">غائب: {totals.absent}</p>
            <p className="text-amber-500">متأخر: {totals.late}</p>
            <p className="text-blue-500">مبرر: {totals.excused}</p>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
      </div>

      {/* القائمة */}
      <div className="space-y-2">
        {rows.map((r, i) => {
          const Icon = STATUS_ICONS[r.status];
          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    r.status === "present" && "bg-emerald-500/15 text-emerald-500",
                    r.status === "absent" && "bg-red-500/15 text-red-500",
                    r.status === "late" && "bg-amber-500/15 text-amber-500",
                    r.status === "excused" && "bg-blue-500/15 text-blue-500"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {r.session.title || r.session.teams?.name || "جلسة تدريب"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.session.session_date).toLocaleDateString("ar", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px]",
                  r.status === "present" && "bg-emerald-500/15 text-emerald-500",
                  r.status === "absent" && "bg-red-500/15 text-red-500",
                  r.status === "late" && "bg-amber-500/15 text-amber-500",
                  r.status === "excused" && "bg-blue-500/15 text-blue-500"
                )}
              >
                {STATUS_LABELS[r.status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
