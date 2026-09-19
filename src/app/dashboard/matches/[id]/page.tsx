"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Trophy, Plus, X, Edit3, BarChart3, MapPin, Calendar, Clock } from "lucide-react";
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
  teams: { name: string; logo_url: string | null; category: string | null } | null;
};

type Team = { id: string; name: string };
type Player = { id: string; first_name: string; last_name: string; jersey_number: number | null; photo_url: string | null };
type MatchEvent = {
  id: string;
  player_id: string;
  event_type: string;
  minute: number | null;
  note: string | null;
  players: { first_name: string; last_name: string; jersey_number: number | null } | null;
};

const EVENT_LABELS: Record<string, string> = {
  goal: "هدف", assist: "صناعة هدف", own_goal: "هدف بالخطأ",
  yellow_card: "بطاقة صفراء", red_card: "بطاقة حمراء",
};

const EVENT_ICONS: Record<string, string> = {
  goal: "⚽", assist: "🅰️", own_goal: "🥅", yellow_card: "🟨", red_card: "🟥",
};

type Tab = "overview" | "edit";

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
  const [tab, setTab] = useState<Tab>("overview");

  const [teamId, setTeamId] = useState("");
  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [venue, setVenue] = useState("home");
  const [competition, setCompetition] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [notes, setNotes] = useState("");

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
    let q = supabase.from("players").select("id, first_name, last_name, jersey_number, photo_url").eq("academy_id", academyId);
    if (currentTeamId) q = q.eq("team_id", currentTeamId);
    const { data } = await q.order("jersey_number", { ascending: true, nullsFirst: false });
    setPlayers((data as Player[]) || []);
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("matches").select("*, teams(name, logo_url, category)").eq("id", id).single();
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
    setTab("overview");
    setMatch((prev) => prev ? { ...prev, team_id: teamId || null, opponent, match_date: matchDate, match_time: matchTime || null, venue, competition: competition || null, home_score: homeScore === "" ? null : parseInt(homeScore), away_score: awayScore === "" ? null : parseInt(awayScore), notes: notes || null } : null);
    if (match) await loadPlayers(match.academy_id, teamId || null);
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
      match_id: id, player_id: eventPlayer, event_type: eventType,
      minute: eventMinute ? parseInt(eventMinute) : null,
    });
    if (error) { setError(error.message); setAddingEvent(false); return; }
    setEventPlayer(""); setEventType("goal"); setEventMinute(""); setShowEventForm(false); setAddingEvent(false);
    await loadEvents();
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("حذف هذا الحدث؟")) return;
    const supabase = createClient();
    await supabase.from("match_events").delete().eq("id", eventId);
    await loadEvents();
  }

  if (loading) return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  if (!match) return (
    <div className="p-10 text-center">
      <p className="text-muted-foreground">المباراة غير موجودة</p>
      <Link href="/dashboard/matches" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
    </div>
  );

  const goals = events.filter((e) => e.event_type === "goal").length;
  const assists = events.filter((e) => e.event_type === "assist").length;
  const yellow = events.filter((e) => e.event_type === "yellow_card").length;
  const red = events.filter((e) => e.event_type === "red_card").length;
  const ownGoals = events.filter((e) => e.event_type === "own_goal").length;
  const hasResult = match.home_score != null && match.away_score != null;
  const result = hasResult
    ? (match.home_score! > match.away_score! ? "فوز" : match.home_score! < match.away_score! ? "خسارة" : "تعادل")
    : null;
  const resultColor = result === "فوز" ? "text-emerald-500" : result === "خسارة" ? "text-red-500" : "text-amber-500";

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard/matches" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للمباريات
        </Link>

        <div className="mb-6 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {match.competition && <span className="text-xs text-muted-foreground">{match.competition}</span>}
            {result && <span className={`text-xs font-bold ${resultColor}`}>• {result}</span>}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center min-w-0">
              {match.teams?.logo_url && (
                <img src={match.teams.logo_url} alt={match.teams.name} style={{ width: 40, height: 40, objectFit: "cover" }} className="rounded-lg mx-auto mb-2 border" />
              )}
              <p className="text-xs text-muted-foreground mb-1">فريقنا</p>
              <p className="text-sm md:text-base font-bold truncate">{match.teams?.name || "—"}</p>
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
            <div className="flex-1 text-center min-w-0">
              <p className="text-xs text-muted-foreground mb-1">الخصم</p>
              <p className="text-sm md:text-base font-bold truncate">{match.opponent}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
              <Calendar className="h-3 w-3" />
              {new Date(match.match_date).toLocaleDateString("ar", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
            {match.match_time && (
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{match.match_time.slice(0, 5)}</span>
              </span>
            )}
            {match.venue && (
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
                <MapPin className="h-3 w-3" />
                {match.venue === "home" ? "ملعبنا" : match.venue === "away" ? "خارج" : "محايد"}
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 flex items-center gap-1 border-b border-border/60">
          <button onClick={() => setTab("overview")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "overview" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <BarChart3 className="inline h-4 w-4 ml-1" />نظرة عامة
          </button>
          <button onClick={() => setTab("edit")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "edit" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Edit3 className="inline h-4 w-4 ml-1" />تعديل
          </button>
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-2">
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="font-mono text-xl font-bold text-emerald-500">{goals}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">⚽ هدف</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="font-mono text-xl font-bold text-blue-500">{assists}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">🅰️ صناعة</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="font-mono text-xl font-bold text-amber-500">{yellow}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">🟨 صفراء</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="font-mono text-xl font-bold text-red-500">{red}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">🟥 حمراء</p>
              </div>
              <div className="rounded-xl border bg-card p-3 text-center">
                <p className="font-mono text-xl font-bold text-muted-foreground">{ownGoals}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">🥅 خطأ</p>
              </div>
            </div>

            <section className="rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">MATCH EVENTS</h2>
                <Button size="sm" variant="outline" onClick={() => setShowEventForm(!showEventForm)}>
                  {showEventForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {showEventForm ? "إلغاء" : "إضافة حدث"}
                </Button>
              </div>

              {showEventForm && (
                <form onSubmit={handleAddEvent} className="mb-4 grid gap-3 rounded-xl border bg-muted/20 p-3 md:grid-cols-[1fr_140px_80px_auto]">
                  <select value={eventPlayer} onChange={(e) => setEventPlayer(e.target.value)} required disabled={addingEvent} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="">اختر اللاعب</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jersey_number != null ? `#${p.jersey_number} ` : ""}{p.first_name} {p.last_name}
                      </option>
                    ))}
                  </select>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} disabled={addingEvent} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="goal">⚽ هدف</option>
                    <option value="assist">🅰️ صناعة</option>
                    <option value="own_goal">🥅 هدف بالخطأ</option>
                    <option value="yellow_card">🟨 بطاقة صفراء</option>
                    <option value="red_card">🟥 بطاقة حمراء</option>
                  </select>
                  <Input type="number" min="1" max="120" placeholder="دقيقة" value={eventMinute} onChange={(e) => setEventMinute(e.target.value)} disabled={addingEvent} dir="ltr" />
                  <Button type="submit" disabled={addingEvent || !eventPlayer} size="sm">
                    {addingEvent ? "..." : "إضافة"}
                  </Button>
                </form>
              )}

              {players.length === 0 && (
                <p className="mb-4 rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground text-center">
                  {match.team_id ? "لا يوجد لاعبون في هذا الفريق" : "اختر فريقاً للمباراة ليظهر لاعبيه"}
                </p>
              )}

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
                        {ev.minute && <span className="font-mono text-xs text-muted-foreground">{ev.minute}'</span>}
                        <button type="button" onClick={() => handleDeleteEvent(ev.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {match.notes && (
              <section>
                <h2 className="mb-3 text-sm font-mono uppercase tracking-wider text-muted-foreground">NOTES</h2>
                <div className="rounded-2xl border bg-card p-4">
                  <p className="text-sm whitespace-pre-wrap">{match.notes}</p>
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "edit" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="team">فريقنا</Label>
                  <select id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
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
              <Button type="button" variant="outline" onClick={() => setTab("overview")} disabled={saving}>إلغاء</Button>
            </div>
          </form>
        )}

        <div className="mt-10 pt-6 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />{deleting ? "جاري الحذف..." : "حذف المباراة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
