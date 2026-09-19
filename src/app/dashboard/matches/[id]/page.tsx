"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Trophy, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Match = {
  id: string;
  team_id: string | null;
  academy_id: string;
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
type Player = { id: string; first_name: string; last_name: string; jersey_number: number | null };
type MatchEvent = {
  id: string;
  player_id: string;
  event_type: string;
  minute: number | null;
  note: string | null;
  players: { first_name: string; last_name: string; jersey_number: number | null } | null;
};

const EVENT_LABELS: Record<string, string> = {
  goal: "هدف",
  assist: "صناعة هدف",
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);

  // Form
  const [teamId, setTeamId] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [venue, setVenue] = useState("home");
  const [competition, setCompetition] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [notes, setNotes] = useState("");

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventPlayer, setEventPlayer] = useState("");
  const [eventType, setEventType] = useState("goal");
  const [eventMinute, setEventMinute] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  async function loadEvents() {
    const supabase = createClient();
    const { data } = await supabase
      .from("match_events")
      .select("id, player_id, event_type, minute, note, players(first_name, last_name, jersey_number)")
      .eq("match_id", id)
      .order("minute", { ascending: true, nullsFirst: false });
    setEvents((data as unknown) as MatchEvent[] || []);
  }

  async function loadPlayers(academyId: string, currentTeamId: string | null) {
    const supabase = createClient();
    let q = supabase.from("players").select("id, first_name, last_name, jersey_number").eq("academy_id", academyId);
    if (currentTeamId) q = q.eq("team_id", currentTeamId);
    const { data } = await q.order("jersey_number", { ascending: true, nullsFirst: false });
    setPlayers((data as Player[]) || []);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("matches").select("*, teams(name)").eq("id", id).single();
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

      const { data: t } = await supabase.from("teams").select("id, name").eq("academy_id", m.academy_id).order("name");
      setTeams(t || []);

      await loadPlayers(m.academy_id, m.team_id);
      await loadEvents();
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

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventPlayer) return;
    setAddingEvent(true);

    const supabase = createClient();
    const { error } = await supabase.from("match_events").insert({
      match_id: id,
      player_id: eventPlayer,
      event_type: eventType,
      minute: eventMinute ? parseInt(eventMinute) : null,
    });

    if (error) { setError(error.message); setAddingEvent(false); return; }

    setEventPlayer("");
    setEventType("goal");
    setEventMinute("");
    setShowEventForm(false);
    setAddingEvent(false);
    await loadEvents();
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("حذف هذا الحدث؟")) return;
    const supabase = createClient();
    await supabase.from("match_events").delete().eq("id", eventId);
    await loadEvents();
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

  const goals = events.filter((e) => e.event_type === "goal").length;
  const assists = events.filter((e) => e.event_type === "assist").length;
  const yellow = events.filter((e) => e.event_type === "yellow_card").length;
  const red = events.filter((e) => e.event_type === "red_card").length;

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/matches" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للمباريات
        </Link>

        {/* Score card */}
        <div className="mb-8 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {match.competition && <span className="text-xs text-muted-foreground">{match.competition}</span>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">فريقنا</p>
              <p className="text-sm md:text-base font-bold">{match.teams?.name || "—"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-xl font-bold border">
                {match.home_score ?? "—"}
              </span>
              <span className="text-muted-foreground">:</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-xl font-bold border">
                {match.away_score ?? "—"}
              </span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground mb-1">الخصم</p>
              <p className="text-sm md:text-base font-bold">{match.opponent}</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {new Date(match.match_date).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {match.match_time && ` • ${match.match_time.slice(0, 5)}`}
            {match.venue && ` • ${match.venue === "home" ? "🏠" : match.venue === "away" ? "✈️" : "⚖️"}`}
          </p>
        </div>

        {/* Match Events Section */}
        <section className="mb-8 rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold">أحداث المباراة</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                ⚽ {goals} هدف • 🅰️ {assists} صناعة • 🟨 {yellow} • 🟥 {red}
              </p>
            </div>
            <Button size="sm" onClick={() => setShowEventForm(!showEventForm)}>
              {showEventForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showEventForm ? "إلغاء" : "إضافة حدث"}
            </Button>
          </div>

          {/* Add event form */}
          {showEventForm && (
            <form onSubmit={handleAddEvent} className="mb-5 grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[1fr_140px_90px_auto]">
              <select
                value={eventPlayer}
                onChange={(e) => setEventPlayer(e.target.value)}
                required
                disabled={addingEvent}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">اختر اللاعب</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jersey_number != null ? `#${p.jersey_number} ` : ""}{p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                disabled={addingEvent}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="goal">⚽ هدف</option>
                <option value="assist">🅰️ صناعة</option>
                <option value="own_goal">🥅 هدف بالخطأ</option>
                <option value="yellow_card">🟨 بطاقة صفراء</option>
                <option value="red_card">🟥 بطاقة حمراء</option>
              </select>
              <Input
                type="number"
                min="1"
                max="120"
                placeholder="دقيقة"
                value={eventMinute}
                onChange={(e) => setEventMinute(e.target.value)}
                disabled={addingEvent}
                dir="ltr"
              />
              <Button type="submit" disabled={addingEvent || !eventPlayer}>
                {addingEvent ? "..." : "إضافة"}
              </Button>
            </form>
          )}

          {players.length === 0 && (
            <p className="mb-4 rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground text-center">
              {match.team_id ? "لا يوجد لاعبون في هذا الفريق — أضف لاعبين أولاً" : "اختر فريقاً للمباراة ليظهر لاعبيه"}
            </p>
          )}

          {/* Events list */}
          {events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">— لا يوجد أحداث مسجلة —</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{EVENT_ICONS[ev.event_type]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ev.players ? `${ev.players.first_name} ${ev.players.last_name}` : "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {EVENT_LABELS[ev.event_type]}
                        {ev.players?.jersey_number != null && ` • #${ev.players.jersey_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.minute && (
                      <span className="font-mono text-xs text-muted-foreground">{ev.minute}'</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Edit Form */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">تعديل التفاصيل</h2>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
                  onChange={async (e) => {
                    setTeamId(e.target.value);
                    if (match) await loadPlayers(match.academy_id, e.target.value || null);
                  }}
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
              <div className="space-y-2"><Label htmlFor="date">التاريخ</Label><Input id="date" type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required disabled={saving} /></div>
              <div className="space-y-2"><Label htmlFor="time">الوقت</Label><Input id="time" type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} disabled={saving} /></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">الملعب</Label>
                <select id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="home">على ملعبنا</option>
                  <option value="away">على ملعب الخصم</option>
                  <option value="neutral">ملعب محايد</option>
                </select>
              </div>
              <div className="space-y-2"><Label htmlFor="competition">المسابقة</Label><Input id="competition" value={competition} onChange={(e) => setCompetition(e.target.value)} disabled={saving} /></div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h3 className="text-sm font-semibold text-muted-foreground">النتيجة</h3>
            <p className="text-xs text-muted-foreground -mt-2">اتركها فارغة إذا لم تُلعب المباراة بعد</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="homeScore">أهداف فريقنا</Label><Input id="homeScore" type="number" min="0" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} disabled={saving} dir="ltr" /></div>
              <div className="space-y-2"><Label htmlFor="awayScore">أهداف الخصم</Label><Input id="awayScore" type="number" min="0" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} disabled={saving} dir="ltr" /></div>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border bg-card p-6">
            <Label htmlFor="notes">ملاحظات</Label>
            <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" />
          </div>

          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>)}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}><Save className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</Button>
            <Link href="/dashboard/matches"><Button type="button" variant="outline" disabled={saving}>إلغاء</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
