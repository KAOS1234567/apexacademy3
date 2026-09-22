"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, X, MapPin, Clock } from "lucide-react";

type Session = {
  id: string;
  title: string | null;
  session_date: string;
  start_time: string | null;
  location: string | null;
  session_type: string | null;
  teams: { name: string } | null;
};

type MatchLite = {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string | null;
  home_score: number | null;
  away_score: number | null;
  league_id: string | null;
  teams: { name: string } | null;
};

const AR_DAYS = ["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];
const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function pad(n: number) { return n.toString().padStart(2, "0"); }
function weekdayIdx(jsDay: number): number { return jsDay === 6 ? 0 : jsDay + 1; }

export function ScheduleCalendar({
  sessions, matches,
}: {
  sessions: Session[];
  matches: MatchLite[];
}) {
  const byDate = useMemo(() => {
    const m = new Map<string, { sessions: Session[]; matches: MatchLite[] }>();
    function ensure(k: string) {
      if (!m.has(k)) m.set(k, { sessions: [], matches: [] });
      return m.get(k)!;
    }
    for (const s of sessions) ensure(s.session_date).sessions.push(s);
    for (const mt of matches) ensure(mt.match_date).matches.push(mt);
    return m;
  }, [sessions, matches]);

  const initialDate = useMemo(() => {
    const allDates = [
      ...sessions.map(s => s.session_date),
      ...matches.map(m => m.match_date),
    ].sort();
    if (allDates.length === 0) return new Date();
    const [y, mo] = allDates[0].split("-").map(Number);
    return new Date(y, mo - 1, 1);
  }, [sessions, matches]);

  const router = useRouter();
  const [cursor, setCursor] = useState(initialDate);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = weekdayIdx(firstOfMonth.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;

  function dateKey(d: number) { return `${year}-${pad(month+1)}-${pad(d)}`; }
  function isPast(key: string) { return key < todayKey; }

  const selected = selectedDay ? (byDate.get(selectedDay) || { sessions: [], matches: [] }) : { sessions: [], matches: [] };
  const hasSelection = selected.sessions.length + selected.matches.length > 0;

  return (
    <div className="mx-auto w-full max-w-full md:max-w-[800px] rounded-2xl border bg-card p-2 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="rounded-lg p-2 transition hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">{AR_MONTHS[month]} {year}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="rounded-lg p-2 transition hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 md:mb-2 grid grid-cols-7 gap-1 md:gap-1.5 text-center text-[9px] md:text-xs text-muted-foreground">
        {AR_DAYS.map(d => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const key = dateKey(d);
          const bucket = byDate.get(key) || { sessions: [], matches: [] };
          const total = bucket.sessions.length + bucket.matches.length;
          const past = isPast(key);
          const isToday = key === todayKey;
          const hasItems = total > 0;
          const clickable = !past;

          const times = [
            ...bucket.sessions.map(s => s.start_time).filter(Boolean),
            ...bucket.matches.map(m => m.match_time).filter(Boolean),
          ].sort();
          const firstTime = times.length > 0 ? (() => {
            const t = times[0] as string;
            const [hStr, mStr] = t.split(":");
            let h = parseInt(hStr, 10);
            const suffix = h >= 12 ? "م" : "ص";
            if (h === 0) h = 12;
            else if (h > 12) h = h - 12;
            return `${h}:${mStr} ${suffix}`;
          })() : "";

          const firstTeamName =
            bucket.sessions[0]?.teams?.name ||
            bucket.matches[0]?.teams?.name ||
            "";

          let cellCls = "min-h-[54px] sm:min-h-[70px] md:min-h-0 md:aspect-[5/6] rounded-lg md:rounded-xl border font-medium transition flex flex-col items-center justify-center gap-0.5 md:gap-1 px-0.5 py-1 md:py-1.5 overflow-hidden";
          if (past) {
            cellCls += "border-border/30 bg-background/30 text-muted-foreground/40 cursor-not-allowed";
          } else if (isToday) {
            cellCls += "border-2 border-amber-400 bg-amber-400/10 text-foreground";
          } else if (hasItems) {
            cellCls += "border-primary/40 bg-primary/5 hover:bg-primary/15 cursor-pointer text-foreground";
          } else {
            cellCls += "border-border/50 bg-background/50 hover:bg-muted/40 cursor-pointer text-foreground";
          }

          return (
            <button
              key={i}
              disabled={!clickable}
              onClick={() => {
                if (!clickable) return;
                if (hasItems) setSelectedDay(key);
                else router.push(`/dashboard/schedule/new?date=${key}`);
              }}
              className={cellCls}
            >
              <span className={`text-sm sm:text-base md:text-2xl leading-none ${isToday ? "font-bold" : ""}`}>{d}</span>
              {hasItems && (
                <>
                  {firstTeamName && (
                    <span className="max-w-full truncate text-[7px] sm:text-[8px] md:text-[9px] leading-tight text-foreground font-medium">
                      {firstTeamName}
                    </span>
                  )}
                  {firstTime && (
                    <span className="text-[8px] sm:text-[9px] md:text-[10px] leading-none text-muted-foreground font-semibold">
                      {firstTime}
                    </span>
                  )}
                  <div className="flex items-center justify-center gap-0.5">
                    {bucket.sessions.length > 0 && (
                      <span className="text-sm sm:text-base md:text-2xl leading-none">
                        {(() => {
                          const t = bucket.sessions[0].session_type;
                          if (t === "match") return "🏆";
                          if (t === "cup") return "🏅";
                          if (t === "rest") return "💤";
                          if (t === "meeting") return "📋";
                          return "🎯";
                        })()}
                      </span>
                    )}
                    {bucket.matches.some(m => m.league_id) && (
                      <span className="text-sm sm:text-base md:text-2xl leading-none">🏆</span>
                    )}
                    {bucket.matches.some(m => !m.league_id) && (
                      <span className="text-sm sm:text-base md:text-2xl leading-none">⚽</span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && hasSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedDay(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-4 shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{selectedDay}</h3>
              <button onClick={() => setSelectedDay(null)}
                className="rounded-lg p-1 transition hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {selected.matches.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-500">
                  🏆 المباريات
                </div>
                <div className="space-y-2">
                  {selected.matches.map(m => {
                    const hasScore = m.home_score !== null && m.away_score !== null;
                    return (
                      <Link
                        key={m.id}
                        href={`/dashboard/matches/${m.id}`}
                        className="block rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-1 transition hover:border-amber-500/60 hover:bg-amber-500/10"
                      >
                        <div className="font-medium">
                          {m.teams?.name || "مباراة"} <span className="text-muted-foreground">ضد</span> {m.opponent || "—"}
                        </div>
                        {m.match_time && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" /> {m.match_time.slice(0, 5)}
                          </div>
                        )}
                        {hasScore && (
                          <div className="font-mono text-sm font-bold">
                            {m.home_score} - {m.away_score}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {selected.sessions.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  🎯 التدريبات
                </div>
                <div className="space-y-2">
                  {selected.sessions.map(s => (
                    <Link
                      key={s.id}
                      href={`/dashboard/schedule/${s.id}/edit`}
                      className="block rounded-lg border bg-background p-3 text-xs space-y-1 transition hover:border-primary/50 hover:bg-muted/30"
                    >
                      <div className="font-medium">{s.title || s.teams?.name || "تدريب"}</div>
                      {s.teams?.name && s.title && (
                        <div className="text-muted-foreground">الفريق: {s.teams.name}</div>
                      )}
                      {s.start_time && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {s.start_time.slice(0, 5)}
                        </div>
                      )}
                      {s.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {s.location}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
