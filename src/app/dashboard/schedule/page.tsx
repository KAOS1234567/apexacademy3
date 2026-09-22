"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Calendar, List as ListIcon } from "lucide-react";
import { ScheduleCalendar } from "@/components/features/ScheduleCalendar";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

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

export default function SchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [matches, setMatches] = useState<MatchLite[]>([]);
  const [view, setView] = useState<"list" | "calendar">("calendar");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members")
        .select("academy_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const { data, error } = await supabase
        .from("training_sessions")
        .select("id, title, session_date, start_time, location, session_type, teams(name)")
        .eq("academy_id", members[0].academy_id)
        .order("session_date", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }
      setSessions((data as unknown) as Session[] || []);

      const { data: mData } = await supabase
        .from("matches")
        .select("id, match_date, match_time, opponent, home_score, away_score, league_id, teams(name)")
        .eq("academy_id", members[0].academy_id)
        .order("match_date", { ascending: false });

      setMatches((mData as unknown) as MatchLite[] || []);
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

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الجدول</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sessions.length} جلسة</p>
        </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border bg-card p-0.5">
              <button onClick={() => setView("list")}
                className={`rounded-md px-3 py-1.5 transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <ListIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setView("calendar")}
                className={`rounded-md px-3 py-1.5 transition ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Calendar className="h-3.5 w-3.5" />
              </button>
            </div>
        <Link href="/dashboard/schedule/new">
          <Button><Plus className="h-4 w-4" />جلسة جديدة</Button>
        </Link>
          </div>
      </div>

      {view === "calendar" && sessions.length > 0 ? (
        <ScheduleCalendar sessions={sessions} matches={matches} />
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">لا يوجد جلسات بعد</h3>
          <p className="mb-6 text-sm text-muted-foreground">ابدأ بإنشاء أول جلسة تدريب</p>
          <Link href="/dashboard/schedule/new">
            <Button><Plus className="h-4 w-4" />جلسة جديدة</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/schedule/${s.id}`}
              className="flex items-center justify-between rounded-2xl border bg-card p-4 transition hover:border-primary/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <span className="text-lg font-bold leading-none">
                    {new Date(s.session_date).getDate()}
                  </span>
                  <span className="mt-0.5 text-[10px] leading-none">
                    {new Date(s.session_date).toLocaleDateString("ar", { month: "short" })}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {s.title || s.teams?.name || "جلسة تدريب"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.teams?.name || "بدون فريق"}
                    {s.start_time && ` • ${s.start_time.slice(0, 5)}`}
                    {s.location && ` • ${s.location}`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
