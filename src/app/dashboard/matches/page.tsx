"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  teams: { name: string } | null;
};

export default function MatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);

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
        .from("matches")
        .select("id, opponent, match_date, match_time, venue, competition, home_score, away_score, teams!matches_team_id_fkey(name)")
        .eq("academy_id", members[0].academy_id)
        .order("match_date", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }
      setMatches((data as unknown) as Match[] || []);
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
          <h1 className="text-2xl font-bold">المباريات</h1>
          <p className="mt-1 text-sm text-muted-foreground">{matches.length} مباراة</p>
        </div>
        <Link href="/dashboard/matches/new">
          <Button><Plus className="h-4 w-4" />مباراة جديدة</Button>
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Trophy className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">لا يوجد مباريات بعد</h3>
          <p className="mb-6 text-sm text-muted-foreground">أضف أول مباراة لفريقك</p>
          <Link href="/dashboard/matches/new">
            <Button><Plus className="h-4 w-4" />مباراة جديدة</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const hasResult = m.home_score != null && m.away_score != null;
            return (
              <Link
                key={m.id}
                href={`/dashboard/matches/${m.id}`}
                className="block rounded-2xl border bg-card p-4 transition hover:border-primary/50"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {m.teams?.name || "الفريق"} × {m.opponent}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.match_date).toLocaleDateString("ar", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {m.match_time && ` • ${m.match_time.slice(0, 5)}`}
                        {m.competition && ` • ${m.competition}`}
                      </p>
                    </div>
                  </div>
                  {hasResult && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold",
                          (m.home_score ?? 0) > (m.away_score ?? 0)
                            ? "bg-emerald-500/20 text-emerald-500"
                            : "bg-muted"
                        )}
                      >
                        {m.home_score}
                      </span>
                      <span className="text-xs text-muted-foreground">-</span>
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold",
                          (m.away_score ?? 0) > (m.home_score ?? 0)
                            ? "bg-emerald-500/20 text-emerald-500"
                            : "bg-muted"
                        )}
                      >
                        {m.away_score}
                      </span>
                    </div>
                  )}
                  {!hasResult && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                      لم تُلعب
                    </span>
                  )}
                </div>
                {m.venue && (
                  <p className="text-xs text-muted-foreground">
                    {m.venue === "home" ? "🏠 ملعبنا" : m.venue === "away" ? "✈️ خارج" : "⚖️ محايد"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
