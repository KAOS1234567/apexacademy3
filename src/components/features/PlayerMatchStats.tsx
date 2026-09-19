"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  event_type: string;
  minute: number | null;
  match: {
    id: string;
    opponent: string;
    match_date: string;
    home_score: number | null;
    away_score: number | null;
    teams: { name: string } | null;
  } | null;
};

const EVENT_LABELS: Record<string, string> = {
  goal: "هدف",
  assist: "صناعة",
  own_goal: "هدف بالخطأ",
  yellow_card: "بطاقة صفراء",
  red_card: "بطاقة حمراء",
};

const EVENT_ICONS: Record<string, string> = {
  goal: "⚽",
  assist: "🅰️",
  own_goal: "🥅",
  yellow_card: "🟨",
  red_card: "🟥",
};

export function PlayerMatchStats({ playerId }: { playerId: string }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("match_events")
        .select("id, event_type, minute, match:matches(id, opponent, match_date, home_score, away_score, teams(name))")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      setEvents((data as unknown) as EventRow[] || []);
      setLoading(false);
    }
    load();
  }, [playerId]);

  if (loading) {
    return <div className="rounded-2xl border bg-card p-6 text-center"><p className="text-sm text-muted-foreground">···</p></div>;
  }

  const goals = events.filter((e) => e.event_type === "goal").length;
  const assists = events.filter((e) => e.event_type === "assist").length;
  const yellow = events.filter((e) => e.event_type === "yellow_card").length;
  const red = events.filter((e) => e.event_type === "red_card").length;
  const ownGoals = events.filter((e) => e.event_type === "own_goal").length;

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
        <p className="text-sm text-muted-foreground">لا يوجد إحصائيات مباريات بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 5 stats cards */}
      <div className="grid grid-cols-5 gap-2">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-xl font-bold text-emerald-500">{goals}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">⚽ هدف</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-xl font-bold text-blue-500">{assists}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">🅰️ صناعة</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-xl font-bold text-amber-500">{yellow}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">🟨 صفراء</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-xl font-bold text-red-500">{red}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">🟥 حمراء</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="font-mono text-xl font-bold text-muted-foreground">{ownGoals}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">🥅 خطأ</p>
        </div>
      </div>

      {/* Events list */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="border-b px-4 py-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          MATCH LOG
        </div>
        <div className="divide-y">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/dashboard/matches/${ev.match?.id || ""}`}
              className="flex items-center justify-between gap-3 p-3 hover:bg-muted/20 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base shrink-0">{EVENT_ICONS[ev.event_type]}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                    {ev.match?.teams?.name || "فريقنا"} × {ev.match?.opponent || "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {ev.match?.match_date
                      ? new Date(ev.match.match_date).toLocaleDateString("ar", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                    {ev.match && ev.match.home_score != null && ev.match.away_score != null && (
                      <span className="ml-2 font-mono">
                        ({ev.match.home_score}-{ev.match.away_score})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground">{EVENT_LABELS[ev.event_type]}</span>
                {ev.minute != null && (
                  <span className="font-mono text-[11px] text-muted-foreground w-9 text-left">{ev.minute}'</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
