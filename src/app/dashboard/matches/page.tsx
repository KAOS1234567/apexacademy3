"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useDict } from "@/i18n/DictProvider";
import { matchesDict } from "@/i18n/matches";
import { cn } from "@/lib/utils";

type Match = {
  id: string;
  opponent: string;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  competition: string | null;
  home_score: number | null;
  away_score: number | null;
  team_id: string | null;
};

type Team = { id: string; name: string; logo_url: string | null };

export default function MatchesPage() {
  const router = useRouter();
  const { locale } = useDict();
  const m = matchesDict[locale as keyof typeof matchesDict] || matchesDict.ar;
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, Team>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      const aid = members[0].academy_id;

      const [mData, tData] = await Promise.all([
        supabase.from("matches").select("id, opponent, match_date, match_time, venue, competition, home_score, away_score, team_id").eq("academy_id", aid).order("match_date", { ascending: false }),
        supabase.from("teams").select("id, name, logo_url").eq("academy_id", aid),
      ]);

      const map: Record<string, Team> = {};
      (tData.data as Team[] || []).forEach((t) => { map[t.id] = t; });

      setMatches((mData.data as Match[]) || []);
      setTeamsMap(map);
      setLoading(false);
    }
    load();
  }, [router]);

  const localeCode = locale === "ar" ? "ar" : locale === "ku" ? "ckb" : locale === "es" ? "es" : "en";

  if (loading) return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">···</p></div>;

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{m.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{matches.length} {m.matchWord}</p>
        </div>
        <Link href="/dashboard/matches/new"><Button><Plus className="h-4 w-4" />{m.addMatch}</Button></Link>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Trophy className="h-6 w-6 text-muted-foreground" /></div>
          <h3 className="mb-2 text-lg font-semibold">{m.noMatches}</h3>
          <p className="mb-6 text-sm text-muted-foreground">{m.noMatchesDesc}</p>
          <Link href="/dashboard/matches/new"><Button><Plus className="h-4 w-4" />{m.addMatch}</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((mt) => {
            const hasResult = mt.home_score != null && mt.away_score != null;
            const team = mt.team_id ? teamsMap[mt.team_id] : null;
            return (
              <Link key={mt.id} href={`/dashboard/matches/${mt.id}`} className="block rounded-2xl border bg-card p-4 transition hover:border-primary/50">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {team?.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="h-10 w-10 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15"><Trophy className="h-5 w-5 text-primary" /></div>
                    )}
                    <div>
                      <p className="font-medium">{team?.name || m.form.teamNone} × {mt.opponent}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(mt.match_date).toLocaleDateString(localeCode, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        {mt.match_time && ` • ${mt.match_time.slice(0, 5)}`}
                        {mt.competition && ` • ${mt.competition}`}
                      </p>
                    </div>
                  </div>
                  {hasResult ? (
                    <div className="flex items-center gap-1.5">
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold", (mt.home_score ?? 0) > (mt.away_score ?? 0) ? "bg-emerald-500/20 text-emerald-500" : "bg-muted")}>{mt.home_score}</span>
                      <span className="text-xs text-muted-foreground">-</span>
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold", (mt.away_score ?? 0) > (mt.home_score ?? 0) ? "bg-emerald-500/20 text-emerald-500" : "bg-muted")}>{mt.away_score}</span>
                    </div>
                  ) : (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">{m.notPlayed}</span>
                  )}
                </div>
                {mt.venue && (<p className="text-xs text-muted-foreground">{mt.venue === "home" ? `🏠 ${m.home}` : mt.venue === "away" ? `✈️ ${m.away}` : `⚖️ ${m.neutral}`}</p>)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
