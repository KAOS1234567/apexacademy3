"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Match = {
  id: string;
  team_id: string | null;
  opponent: string;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  competition: string | null;
  home_score: number | null;
  away_score: number | null;
  notes: string | null;
  teams: { name: string } | null;
};

type Team = { id: string; name: string };

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const [teamId, setTeamId] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [venue, setVenue] = useState("home");
  const [competition, setCompetition] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("matches")
        .select("*, teams(name)")
        .eq("id", id)
        .single();

      if (error || !data) { setError("المباراة غير موجودة"); setLoading(false); return; }

      const m = data as unknown as Match;
      setMatch(m);
      setTeamId(m.team_id || "");
      setOpponent(m.opponent);
      setMatchDate(m.match_date);
      setMatchTime(m.match_time || "");
      setVenue(m.venue || "home");
      setCompetition(m.competition || "");
      setHomeScore(m.home_score?.toString() ?? "");
      setAwayScore(m.away_score?.toString() ?? "");
      setNotes(m.notes || "");

      const { data: t } = await supabase.from("teams").select("id, name").eq("academy_id", (await supabase.from("matches").select("academy_id").eq("id", id).single()).data?.academy_id || "");
      setTeams(t || []);
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("matches").update({
      team_id: teamId || null,
      opponent: opponent.trim(),
      match_date: matchDate,
      match_time: matchTime || null,
      venue,
      competition: competition.trim() || null,
      home_score: homeScore === "" ? null : parseInt(homeScore),
      away_score: awayScore === "" ? null : parseInt(awayScore),
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    router.push("/dashboard/matches");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("حذف هذه المباراة؟")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("matches").delete().eq("id", id);
    router.push("/dashboard/matches");
    router.refresh();
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  }

  if (!match) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">المباراة غير موجودة</p>
        <Link href="/dashboard/matches" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/matches" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          رجوع للمباريات
        </Link>

        {/* عرض المباراة بشكل بطاقة رياضية */}
        <div className="mb-8 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="mb-4 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <p className="text-sm text-muted-foreground">فريقنا</p>
              <p className="mt-1 text-lg font-bold">{match.teams?.name || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-xl font-bold">
                {match.home_score ?? "—"}
              </span>
              <span className="text-muted-foreground">:</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-xl font-bold">
                {match.away_score ?? "—"}
              </span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm text-muted-foreground">الخصم</p>
              <p className="mt-1 text-lg font-bold">{match.opponent}</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {match.match_time && ` • ${match.match_time.slice(0, 5)}`}
            {match.competition && ` • ${match.competition}`}
          </p>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">تعديل التفاصيل</h2>
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

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team">فريقنا</Label>
                <select
                  id="team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">بدون فريق</option>
                  {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opponent">الخصم</Label>
                <Input id="opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} required disabled={saving} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">التاريخ</Label>
                <Input id="date" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">الوقت</Label>
                <Input id="time" type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">الملعب</Label>
                <select
                  id="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="home">على ملعبنا</option>
                  <option value="away">على ملعب الخصم</option>
                  <option value="neutral">ملعب محايد</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="competition">المسابقة</Label>
                <Input id="competition" value={competition} onChange={(e) => setCompetition(e.target.value)} disabled={saving} />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground">النتيجة</h3>
            <p className="text-xs text-muted-foreground -mt-2">اتركها فارغة إذا لم تُلعب المباراة بعد</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeScore">أهداف فريقنا</Label>
                <Input id="homeScore" type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} disabled={saving} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awayScore">أهداف الخصم</Label>
                <Input id="awayScore" type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} disabled={saving} dir="ltr" />
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border bg-card p-6">
            <Label htmlFor="notes">ملاحظات</Label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Link href="/dashboard/matches">
              <Button type="button" variant="outline" disabled={saving}>إلغاء</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
