"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Team = { id: string; name: string };

export default function NewMatchPage() {
  const router = useRouter();
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teamId, setTeamId] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [venue, setVenue] = useState("home");
  const [competition, setCompetition] = useState("");
  const [notes, setNotes] = useState("");

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
      const aid = members[0].academy_id;
      setAcademyId(aid);

      const { data: t } = await supabase.from("teams").select("id, name").eq("academy_id", aid);
      setTeams(t || []);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!academyId) return;

    if (opponent.trim().length < 2) { setError("اسم الخصم مطلوب"); return; }
    if (!matchDate) { setError("التاريخ مطلوب"); return; }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("matches").insert({
      academy_id: academyId,
      team_id: teamId || null,
      opponent: opponent.trim(),
      match_date: matchDate,
      match_time: matchTime || null,
      venue,
      competition: competition.trim() || null,
      notes: notes.trim() || null,
      created_by: user?.id,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard/matches");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/matches" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          رجوع للمباريات
        </Link>

        <h1 className="mb-2 text-2xl font-bold">مباراة جديدة</h1>
        <p className="mb-8 text-sm text-muted-foreground">أضف تفاصيل المباراة القادمة</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="team">فريقنا</Label>
                <select
                  id="team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">بدون فريق</option>
                  {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opponent">الخصم *</Label>
                <Input id="opponent" placeholder="مثال: فريق النصر" value={opponent} onChange={(e) => setOpponent(e.target.value)} required disabled={loading} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">التاريخ *</Label>
                <Input id="date" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">الوقت</Label>
                <Input id="time" type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">الملعب</Label>
                <select
                  id="venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="home">على ملعبنا</option>
                  <option value="away">على ملعب الخصم</option>
                  <option value="neutral">ملعب محايد</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="competition">المسابقة</Label>
                <Input id="competition" placeholder="مثال: دوري الشباب" value={competition} onChange={(e) => setCompetition(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ المباراة"}
            </Button>
            <Link href="/dashboard/matches">
              <Button type="button" variant="outline" disabled={loading}>إلغاء</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
