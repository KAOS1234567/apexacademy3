"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Calendar, List, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/DictProvider";
import { scheduleDict } from "@/i18n/schedule";
import { ScheduleCalendar } from "@/components/features/ScheduleCalendar";

type Session = { id: string; title: string | null; session_date: string; start_time: string | null; location: string | null; teams: { name: string; logo_url: string | null } | null };
type Match = { id: string; opponent: string; match_date: string; match_time: string | null; venue: string | null; home_score: number | null; away_score: number | null; teams: { name: string; logo_url: string | null } | null };

export default function SchedulePage() {
  const router = useRouter();
  const { locale } = useDict();
  const s = scheduleDict[locale as keyof typeof scheduleDict] || scheduleDict.ar;
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<"list" | "calendar">("calendar");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      const aid = members[0].academy_id;

      const [sessRes, matchRes] = await Promise.all([
        supabase.from("training_sessions").select("id, title, session_date, start_time, location, teams(name, logo_url)").eq("academy_id", aid).order("session_date", { ascending: false }),
        supabase.from("matches").select("id, opponent, match_date, match_time, venue, home_score, away_score, teams(name, logo_url)").eq("academy_id", aid).order("match_date", { ascending: false }),
      ]);
      setSessions((sessRes.data as unknown) as Session[] || []);
      setMatches((matchRes.data as unknown) as Match[] || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const localeCode = locale === "ar" ? "ar" : locale === "ku" ? "ckb" : locale === "es" ? "es" : "en";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-muted-foreground">{s.loading || "..."}</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{s.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{sessions.length} {s.sessionWord}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5">
            <button onClick={() => setView("list")} className={view === "list" ? "rounded-md px-3 py-1.5 text-sm transition bg-primary text-primary-foreground" : "rounded-md px-3 py-1.5 text-sm transition text-muted-foreground hover:text-foreground"}>
              <List className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setView("calendar")} className={view === "calendar" ? "rounded-md px-3 py-1.5 text-sm transition bg-primary text-primary-foreground" : "rounded-md px-3 py-1.5 text-sm transition text-muted-foreground hover:text-foreground"}>
              <Calendar className="h-3.5 w-3.5" />
            </button>
          </div>
          <a href="/print/schedule" target="_blank" rel="noopener noreferrer">
            <Button variant="outline"><Printer className="h-4 w-4" />{s.pdf}</Button>
          </a>
          <Link href="/dashboard/schedule/new">
            <Button><Plus className="h-4 w-4" />{s.addSession}</Button>
          </Link>
        </div>
      </div>

      {view === "calendar" && sessions.length > 0 ? (
        <ScheduleCalendar sessions={sessions} matches={matches} locale={locale} />
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">{s.noSessions}</h3>
          <p className="mb-6 text-sm text-muted-foreground">{s.noSessionsDesc}</p>
          <Link href="/dashboard/schedule/new">
            <Button><Plus className="h-4 w-4" />{s.addSession}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((ss) => (
            <Link key={ss.id} href={`/dashboard/schedule/${ss.id}`} className="flex items-center justify-between rounded-2xl border bg-card p-4 transition hover:border-primary/50">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <span className="text-lg font-bold leading-none">{new Date(ss.session_date).getDate()}</span>
                  <span className="mt-0.5 text-[10px] leading-none">{new Date(ss.session_date).toLocaleDateString(localeCode, { month: "short" })}</span>
                </div>
                <div>
                  <p className="font-medium">{ss.title || ss.teams?.name || s.session}</p>
                  <p className="text-xs text-muted-foreground">
                    {ss.teams?.name || s.noTeam}
                    {ss.start_time && ` • ${ss.start_time.slice(0, 5)}`}
                    {ss.location && ` • ${ss.location}`}
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
