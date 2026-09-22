"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowRight, Medal, Trophy, Users, Plus, X, Shield, Globe, Building2, Calendar as CalIcon, Pencil, Printer,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeagueScheduleGenerator } from "@/components/features/LeagueScheduleGenerator";
import { LeagueStandings } from "@/components/features/LeagueStandings";

type League = {
  id: string; academy_id: string; name: string;
  season: string | null; format: string; legs: number; status: string;
};
type Team = { id: string; name: string; category: string | null };
type ExternalTeam = { id: string; name: string };
type LeagueTeam = {
  id: string; team_id: string | null; external_team_id: string | null;
  group_name: string | null;
  teams: Team | null; external_teams: ExternalTeam | null;
};
type Match = {
  id: string; round_number: number | null; match_date: string;
  match_time: string | null; home_score: number | null; away_score: number | null;
  team_id: string | null; away_team_id: string | null; opponent: string | null;
  home_external_team_id: string | null; away_external_team_id: string | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
  home_ext: { name: string } | null;
  away_ext: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = { draft: "مسودة", active: "نشط", finished: "منتهي" };
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  finished: "bg-muted/40 text-muted-foreground",
};
const FORMAT_LABELS: Record<string, string> = { league: "دوري عادي", groups: "مجموعات" };

export default function LeagueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<League | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [leagueTeams, setLeagueTeams] = useState<LeagueTeam[]>([]);
  const [availableInternal, setAvailableInternal] = useState<Team[]>([]);
  const [availableExternal, setAvailableExternal] = useState<ExternalTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuMode, setMenuMode] = useState<"root" | "internal" | "external">("root");
  const [newExternalName, setNewExternalName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"standings" | "matches" | "teams">("standings");
  const [scoringMatch, setScoringMatch] = useState<Match | null>(null);
  const [homeScoreInput, setHomeScoreInput] = useState("");
  const [awayScoreInput, setAwayScoreInput] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const [scoreError, setScoreError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "matches" || t === "teams" || t === "standings") {
      setActiveTab(t);
    }
  }, []);

  function changeTab(tab: "standings" | "matches" | "teams") {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  }
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async (academyId: string) => {
    const supabase = createClient();

    const { data: lt } = await supabase
      .from("league_teams")
      .select("id, team_id, external_team_id, group_name, teams(id, name, category), external_teams(id, name)")
      .eq("league_id", leagueId);

    const { data: internal } = await supabase
      .from("teams").select("id, name, category")
      .eq("academy_id", academyId).order("name");

    const { data: external } = await supabase
      .from("external_teams").select("id, name")
      .eq("academy_id", academyId).order("name");

    const { data: mRows } = await supabase
      .from("matches")
      .select(`
        id, round_number, match_date, match_time, home_score, away_score,
        team_id, away_team_id, opponent,
        home_external_team_id, away_external_team_id,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name),
        home_ext:external_teams!matches_home_external_team_id_fkey(name),
        away_ext:external_teams!matches_away_external_team_id_fkey(name)
      `)
      .eq("league_id", leagueId)
      .order("round_number", { ascending: true });

    const usedInternal = new Set((lt || []).map((x: any) => x.team_id).filter(Boolean));
    const usedExternal = new Set((lt || []).map((x: any) => x.external_team_id).filter(Boolean));

    setLeagueTeams((lt as any) || []);
    setAvailableInternal((internal || []).filter((t: any) => !usedInternal.has(t.id)) as any);
    setAvailableExternal((external || []).filter((t: any) => !usedExternal.has(t.id)) as any);
    setMatches((mRows as any) || []);
  }, [leagueId]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("leagues")
        .select("id, academy_id, name, season, format, legs, status")
        .eq("id", leagueId).maybeSingle();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setLeague(data as League);
      await loadAll(data.academy_id);
      setLoading(false);
    }
    load();
  }, [leagueId, router, loadAll]);

  function closeMenu() {
    setShowMenu(false); setMenuMode("root"); setNewExternalName(""); setError("");
  }

  async function handleAddInternal(teamId: string) {
    if (!league) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("league_teams").insert({ league_id: leagueId, team_id: teamId });
    if (!error) { await loadAll(league.academy_id); closeMenu(); }
    else setError(error.message);
    setBusy(false);
  }

  async function handleAddExternal(existingId: string) {
    if (!league) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("league_teams").insert({ league_id: leagueId, external_team_id: existingId });
    if (!error) { await loadAll(league.academy_id); closeMenu(); }
    else setError(error.message);
    setBusy(false);
  }

  async function handleCreateExternal() {
    if (!league || !newExternalName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("external_teams")
      .insert({ academy_id: league.academy_id, name: newExternalName.trim() })
      .select("id").single();
    if (error || !data) { setError(error?.message || "خطأ"); setBusy(false); return; }
    await supabase.from("league_teams").insert({ league_id: leagueId, external_team_id: data.id });
    await loadAll(league.academy_id);
    closeMenu(); setBusy(false);
  }

  async function handleDeleteLeague() {
    if (!league) return;
    if (deleteConfirmText.trim() !== league.name.trim()) {
      setError("اسم الدوري غير مطابق");
      return;
    }
    setDeleting(true);
    setError("");
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("leagues")
      .delete()
      .eq("id", league.id);
    if (delError) {
      setError(delError.message);
      setDeleting(false);
      return;
    }
    router.push("/dashboard/leagues");
  }

  function openScoreDialog(m: Match) {
    setScoringMatch(m);
    setHomeScoreInput(m.home_score !== null ? String(m.home_score) : "");
    setAwayScoreInput(m.away_score !== null ? String(m.away_score) : "");
    setScoreError("");
  }

  async function handleSaveScore() {
    if (!scoringMatch || !league) return;
    const h = parseInt(homeScoreInput, 10);
    const a = parseInt(awayScoreInput, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setScoreError("أدخل أرقامًا صحيحة (0 أو أكثر)");
      return;
    }
    setSavingScore(true);
    setScoreError("");
    const supabase = createClient();
    const { error: upErr } = await supabase
      .from("matches")
      .update({ home_score: h, away_score: a })
      .eq("id", scoringMatch.id);
    if (upErr) {
      setScoreError(upErr.message);
      setSavingScore(false);
      return;
    }
    await loadAll(league.academy_id);
    setScoringMatch(null);
    setSavingScore(false);
  }

  async function handleRemoveTeam(ltId: string) {
    if (!league) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("league_teams").delete().eq("id", ltId);
    await loadAll(league.academy_id);
    setBusy(false);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (notFound || !league) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">الدوري غير موجود</h3>
          <p className="mb-6 text-sm text-muted-foreground">قد يكون محذوفًا أو لا تملك صلاحية الوصول إليه</p>
          <Link href="/dashboard/leagues">
            <Button variant="outline"><ArrowRight className="h-4 w-4" /> العودة للدوريات</Button>
          </Link>
        </div>
      </div>
    );
  }

  // تجميع المباريات حسب الجولة
  const matchesByRound = matches.reduce<Record<number, Match[]>>((acc, m) => {
    const r = m.round_number || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});
  const roundKeys = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="p-6 md:p-10">
      <Link href="/dashboard/leagues"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" /> العودة للدوريات
      </Link>

      <div className="mb-6 rounded-2xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15">
            <Medal className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{league.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {FORMAT_LABELS[league.format] || league.format}
              {league.season && ` • موسم ${league.season}`}
              {` • ${league.legs === 2 ? "ذهاب وإياب" : "ذهاب فقط"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs ${STATUS_COLORS[league.status] || "bg-muted"}`}>
              {STATUS_LABELS[league.status] || league.status}
            </span>
            <Link href={`/dashboard/leagues/${league.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" /> تعديل
              </Button>
            </Link>
            <a href={`/print/league/${league.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4" /> PDF
              </Button>
            </a>

          </div>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-full border bg-card p-1">
        <button
          onClick={() => changeTab("standings")}
          className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "standings"
              ? "border-2 border-primary bg-background text-foreground"
              : "border-2 border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          الترتيب
        </button>
        <button
          onClick={() => changeTab("matches")}
          className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "matches"
              ? "border-2 border-primary bg-background text-foreground"
              : "border-2 border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          المباريات
        </button>
        <button
          onClick={() => changeTab("teams")}
          className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "teams"
              ? "border-2 border-primary bg-background text-foreground"
              : "border-2 border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          الفرق
        </button>
      </div>

{activeTab === "standings" && (

      <div className="rounded-2xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">جدول الترتيب</h2>
        </div>
        <LeagueStandings matches={matches} />
      </div>
      )}

{activeTab === "matches" && (

      <div className="mb-6 rounded-2xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalIcon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">جدول المباريات</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {matches.length}
            </span>
          </div>
          <LeagueScheduleGenerator
            leagueId={league.id}
            academyId={league.academy_id}
            leagueTeams={leagueTeams}
            legs={league.legs === 2 ? 2 : 1}
            format={league.format}
            existingMatchesCount={matches.length}
            onGenerated={() => loadAll(league.academy_id)}
          />
        </div>

        {matches.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              لم يتم توليد الجدول بعد — أضف الفرق ثم اضغط "توليد الجدول"
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {roundKeys.map((r) => (
              <div key={r}>
                <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                  الجولة {r}
                </h3>
                <div className="space-y-2">
                  {matchesByRound[r].map((m) => {
                    const homeName = m.home_team?.name || m.home_ext?.name || "—";
                    const awayName = m.away_team?.name || m.away_ext?.name || m.opponent || "—";
                    const homeExt = !!m.home_external_team_id;
                    const awayExt = !!m.away_external_team_id;
                    const hasScore = m.home_score !== null && m.away_score !== null;
                    return (
                      <Link key={m.id} href={`/dashboard/matches/${m.id}`}
                        className="block rounded-xl border bg-background p-3 transition hover:border-primary/40">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center justify-end gap-2 text-right">
                            <span className="text-sm font-medium">{homeName}</span>
                            {homeExt && <Globe className="h-3 w-3 text-amber-500" />}
                          </div>
                          <div className="shrink-0 rounded-lg bg-muted px-3 py-1 text-xs font-mono tabular-nums">
                            {hasScore ? `${m.home_score} - ${m.away_score}` : "—"}
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            {awayExt && <Globe className="h-3 w-3 text-amber-500" />}
                            <span className="text-sm font-medium">{awayName}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openScoreDialog(m); }}
                            className="shrink-0 rounded-lg p-1 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                            title="إدخال النتيجة"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex-1 text-center text-[11px] text-muted-foreground">
                            {m.match_date}
                            {m.match_time && ` • ${m.match_time.slice(0, 5)}`}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

{activeTab === "teams" && (

      <div className="mb-6 rounded-2xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">الفرق المشاركة</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {leagueTeams.length}
            </span>
          </div>
          <div className="relative">
            <Button size="sm" onClick={() => setShowMenu((s) => !s)} disabled={busy}>
              <Plus className="h-4 w-4" /> إضافة فريق
            </Button>
            {showMenu && (
              <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border bg-card p-2 shadow-lg">
                {menuMode === "root" && (
                  <>
                    <button onClick={() => setMenuMode("internal")}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm transition hover:bg-muted">
                      <Building2 className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">من فرق أكاديميتي</div>
                        <div className="text-xs text-muted-foreground">{availableInternal.length} فريق متاح</div>
                      </div>
                    </button>
                    <button onClick={() => setMenuMode("external")}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm transition hover:bg-muted">
                      <Globe className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">فريق خارجي</div>
                        <div className="text-xs text-muted-foreground">أضف فريقًا من خارج الأكاديمية</div>
                      </div>
                    </button>
                  </>
                )}
                {menuMode === "internal" && (
                  <>
                    <button onClick={() => setMenuMode("root")}
                      className="mb-1 flex w-full items-center gap-1 rounded-lg px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                      <ArrowRight className="h-3 w-3 rotate-180" /> رجوع
                    </button>
                    {availableInternal.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">كل فرق الأكاديمية مشاركة بالفعل</p>
                    ) : availableInternal.map((t) => (
                      <button key={t.id} onClick={() => handleAddInternal(t.id)} disabled={busy}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm transition hover:bg-muted">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{t.name}</div>
                          {t.category && <div className="text-xs text-muted-foreground">{t.category}</div>}
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {menuMode === "external" && (
                  <>
                    <button onClick={() => setMenuMode("root")}
                      className="mb-1 flex w-full items-center gap-1 rounded-lg px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                      <ArrowRight className="h-3 w-3 rotate-180" /> رجوع
                    </button>
                    <div className="mb-2 flex gap-2 p-1">
                      <Input placeholder="اسم الفريق الخارجي..." value={newExternalName}
                        onChange={(e) => setNewExternalName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateExternal(); }}
                        disabled={busy} className="h-8 text-sm" />
                      <Button size="sm" onClick={handleCreateExternal} disabled={busy || !newExternalName.trim()}>
                        إضافة
                      </Button>
                    </div>
                    {availableExternal.length > 0 && (
                      <>
                        <div className="mt-2 mb-1 px-3 text-xs text-muted-foreground">أو اختر فريقًا سابقًا:</div>
                        {availableExternal.map((t) => (
                          <button key={t.id} onClick={() => handleAddExternal(t.id)} disabled={busy}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm transition hover:bg-muted">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1 font-medium">{t.name}</div>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}
                {error && (
                  <div className="mt-2 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {leagueTeams.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">لا يوجد فرق مشاركة بعد</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leagueTeams.map((lt) => {
              const isExternal = !!lt.external_team_id;
              const displayName = isExternal ? lt.external_teams?.name : lt.teams?.name;
              const sub = !isExternal && lt.teams?.category ? lt.teams.category : null;
              return (
                <div key={lt.id} className="flex items-center gap-3 rounded-xl border bg-background p-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isExternal ? "bg-amber-500/15" : "bg-primary/15"}`}>
                    {isExternal ? <Globe className="h-4 w-4 text-amber-500" /> : <Shield className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {displayName || "—"}
                      {isExternal && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-500">خارجي</span>
                      )}
                    </div>
                    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
                  </div>
                  <button onClick={() => handleRemoveTeam(lt.id)} disabled={busy}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    title="إزالة">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
      {scoringMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !savingScore && setScoringMatch(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-semibold">إدخال نتيجة المباراة</h3>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hs" className="mb-1 block truncate text-center text-xs">
                  {scoringMatch.home_team?.name || scoringMatch.home_ext?.name || "المضيف"}
                </Label>
                <Input id="hs" type="number" min={0} value={homeScoreInput}
                  onChange={(e) => setHomeScoreInput(e.target.value)}
                  disabled={savingScore} className="text-center" />
              </div>
              <div>
                <Label htmlFor="as" className="mb-1 block truncate text-center text-xs">
                  {scoringMatch.away_team?.name || scoringMatch.away_ext?.name || scoringMatch.opponent || "الضيف"}
                </Label>
                <Input id="as" type="number" min={0} value={awayScoreInput}
                  onChange={(e) => setAwayScoreInput(e.target.value)}
                  disabled={savingScore} className="text-center" />
              </div>
            </div>

            {scoreError && (
              <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {scoreError}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveScore} disabled={savingScore} className="flex-1">
                {savingScore ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setScoringMatch(null)}
                disabled={savingScore}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
