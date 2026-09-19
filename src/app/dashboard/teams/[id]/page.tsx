"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Upload, X, Users, Edit3, BarChart3, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Team = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
  description: string | null;
  logo_url: string | null;
  head_coach_id: string | null;
};

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
  photo_url: string | null;
  status: string;
};

type Match = {
  id: string;
  opponent: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
  competition: string | null;
};

type Coach = {
  id: string;
  full_name: string;
  role: string;
  photo_url: string | null;
};

type TeamStats = {
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  matches: number;
};

type Tab = "overview" | "edit";

const ROLE_LABELS: Record<string, string> = {
  head_coach: "مدرب رئيسي",
  coach: "مدرب",
  assistant_coach: "مدرب مساعد",
  analyst: "محلل",
  medical: "طبي",
  accountant: "محاسب",
  staff: "إداري",
};

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [headCoach, setHeadCoach] = useState<Coach | null>(null);
  const [stats, setStats] = useState<TeamStats>({ goals: 0, assists: 0, yellow: 0, red: 0, matches: 0 });
  const [tab, setTab] = useState<Tab>("overview");

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [headCoachId, setHeadCoachId] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("teams").select("*").eq("id", id).single();
      if (error || !data) { setError("الفريق غير موجود"); setLoading(false); return; }
      const t = data as Team;
      setTeam(t);
      setName(t.name);
      setCategory(t.category || "");
      setSeason(t.season || "");
      setDescription(t.description || "");
      setHeadCoachId(t.head_coach_id || "");
      setLogoUrl(t.logo_url);

      const { data: tMeta } = await supabase.from("teams").select("academy_id").eq("id", id).single();
      const aid = tMeta?.academy_id || "";

      const [pData, mData, cData] = await Promise.all([
        supabase
          .from("players")
          .select("id, first_name, last_name, position, jersey_number, photo_url, status")
          .eq("team_id", id)
          .order("jersey_number", { ascending: true, nullsFirst: false }),
        supabase
          .from("matches")
          .select("id, opponent, match_date, home_score, away_score, venue, competition")
          .eq("team_id", id)
          .order("match_date", { ascending: false }),
        supabase
          .from("staff")
          .select("id, full_name, role, photo_url")
          .eq("academy_id", aid)
          .eq("status", "active")
          .order("full_name"),
      ]);
      setPlayers(pData.data || []);
      setMatches(mData.data || []);

      const allCoaches = (cData.data || []) as Coach[];
      setCoaches(allCoaches);
      if (t.head_coach_id) {
        const found = allCoaches.find((c) => c.id === t.head_coach_id);
        setHeadCoach(found || null);
      }

      const { data: evData } = await supabase
        .from("match_events")
        .select("event_type, matches!inner(team_id)")
        .eq("matches.team_id", id);
      const st: TeamStats = { goals: 0, assists: 0, yellow: 0, red: 0, matches: mData.data?.length || 0 };
      (evData || []).forEach((e: { event_type: string }) => {
        if (e.event_type === "goal") st.goals++;
        else if (e.event_type === "assist") st.assists++;
        else if (e.event_type === "yellow_card") st.yellow++;
        else if (e.event_type === "red_card") st.red++;
      });
      setStats(st);

      setLoading(false);
    }
    if (id) load();
  }, [id]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("حجم الصورة كبير (الحد 10MB)"); return; }
    setNewLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearNewLogo() {
    setNewLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    let finalLogoUrl = logoUrl;

    if (newLogoFile) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
        if (members && members.length > 0) {
          const aid = members[0].academy_id;
          const ext = newLogoFile.name.split(".").pop() || "jpg";
          const fileName = `teams/${aid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("players").upload(fileName, newLogoFile);
          if (uploadError) { setError("فشل رفع الشعار: " + uploadError.message); setSaving(false); return; }
          const { data: { publicUrl } } = supabase.storage.from("players").getPublicUrl(fileName);
          finalLogoUrl = publicUrl;
        }
      }
    }

    const { error } = await supabase.from("teams").update({
      name: name.trim(),
      category: category || null,
      season: season.trim() || null,
      description: description.trim() || null,
      head_coach_id: headCoachId || null,
      logo_url: finalLogoUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    setTab("overview");
    setLogoUrl(finalLogoUrl);
    setNewLogoFile(null);
    setLogoPreview(null);
    setTeam((prev) => prev ? { ...prev, name, category, season, description, head_coach_id: headCoachId || null, logo_url: finalLogoUrl } : null);
    const found = coaches.find((c) => c.id === headCoachId);
    setHeadCoach(found || null);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("حذف هذا الفريق؟ كل اللاعبين سيبقون بدون فريق.")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("teams").delete().eq("id", id);
    router.push("/dashboard/teams");
    router.refresh();
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  }

  if (!team) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">الفريق غير موجود</p>
        <Link href="/dashboard/teams" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
      </div>
    );
  }

  const displayLogo = logoPreview || logoUrl;
  const wins = matches.filter((m) => m.home_score != null && m.away_score != null && m.home_score > m.away_score).length;
  const draws = matches.filter((m) => m.home_score != null && m.away_score != null && m.home_score === m.away_score).length;
  const losses = matches.filter((m) => m.home_score != null && m.away_score != null && m.home_score < m.away_score).length;

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard/teams" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للفرق
        </Link>

        <div className="mb-6 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="flex items-start gap-4">
            {displayLogo ? (
              <img src={displayLogo} alt={team.name} style={{ width: 80, height: 80, objectFit: "cover" }} className="rounded-2xl border-2 border-primary shrink-0" />
            ) : (
              <div className="rounded-2xl bg-primary/15 flex items-center justify-center shrink-0" style={{ width: 80, height: 80 }}>
                <Users className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold truncate">{team.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {team.category || "بدون فئة"} • {team.season || "بدون موسم"}
              </p>
              {headCoach && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
                  {headCoach.photo_url ? (
                    <img src={headCoach.photo_url} alt={headCoach.full_name} style={{ width: 20, height: 20, objectFit: "cover" }} className="rounded-full" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Link href={`/dashboard/staff/${headCoach.id}`} className="text-xs hover:text-accent">
                    {headCoach.full_name} · {ROLE_LABELS[headCoach.role] || headCoach.role}
                  </Link>
                </div>
              )}
              {team.description && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{team.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-1 border-b border-border/60">
          <button
            onClick={() => setTab("overview")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "overview" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <BarChart3 className="inline h-4 w-4 ml-1" />
            نظرة عامة
          </button>
          <button
            onClick={() => setTab("edit")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "edit" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Edit3 className="inline h-4 w-4 ml-1" />
            تعديل
          </button>
        </div>

        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">اللاعبون</p>
                <p className="mt-2 font-mono text-3xl font-light">{String(players.length).padStart(2, "0")}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">المباريات</p>
                <p className="mt-2 font-mono text-3xl font-light">{String(stats.matches).padStart(2, "0")}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">⚽ أهداف</p>
                <p className="mt-2 font-mono text-3xl font-light text-emerald-500">{String(stats.goals).padStart(2, "0")}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">🅰️ صناعة</p>
                <p className="mt-2 font-mono text-3xl font-light text-blue-500">{String(stats.assists).padStart(2, "0")}</p>
              </div>
            </div>

            {stats.matches > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="font-mono text-2xl font-light text-emerald-500">{wins}</p>
                  <p className="mt-1 text-xs text-muted-foreground">فوز</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="font-mono text-2xl font-light text-amber-500">{draws}</p>
                  <p className="mt-1 text-xs text-muted-foreground">تعادل</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="font-mono text-2xl font-light text-red-500">{losses}</p>
                  <p className="mt-1 text-xs text-muted-foreground">خسارة</p>
                </div>
              </div>
            )}

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">SQUAD</h2>
                <Link href="/dashboard/players" className="text-xs text-accent hover:underline">كل اللاعبين ←</Link>
              </div>
              {players.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
                  <p className="text-sm text-muted-foreground">لا يوجد لاعبون في هذا الفريق</p>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card overflow-hidden divide-y">
                  {players.map((p) => (
                    <Link key={p.id} href={`/dashboard/players/${p.id}`} className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors group">
                      <span className="font-mono text-xs text-muted-foreground/60 w-8 text-center">
                        {p.jersey_number != null ? String(p.jersey_number).padStart(2, "0") : "—"}
                      </span>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} style={{ width: 32, height: 32, objectFit: "cover" }} className="rounded-full border" />
                      ) : (
                        <div className="rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground" style={{ width: 32, height: 32 }}>
                          {p.first_name.charAt(0)}
                        </div>
                      )}
                      <span className="flex-1 text-sm font-medium truncate group-hover:text-accent transition-colors">
                        {p.first_name} {p.last_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground hidden md:inline">{p.position || "—"}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">FIXTURES</h2>
                <Link href="/dashboard/matches" className="text-xs text-accent hover:underline">كل المباريات ←</Link>
              </div>
              {matches.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
                  <p className="text-sm text-muted-foreground">لا يوجد مباريات لهذا الفريق</p>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card overflow-hidden divide-y">
                  {matches.map((m) => {
                    const hasResult = m.home_score != null && m.away_score != null;
                    return (
                      <Link key={m.id} href={`/dashboard/matches/${m.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/20 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">× {m.opponent}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {new Date(m.match_date).toLocaleDateString("ar", { day: "numeric", month: "short", year: "numeric" })}
                            {m.competition && ` • ${m.competition}`}
                          </p>
                        </div>
                        {hasResult ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${(m.home_score ?? 0) > (m.away_score ?? 0) ? "bg-emerald-500/20 text-emerald-500" : "bg-muted"}`}>
                              {m.home_score}
                            </span>
                            <span className="text-xs text-muted-foreground">-</span>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold ${(m.away_score ?? 0) > (m.home_score ?? 0) ? "bg-emerald-500/20 text-emerald-500" : "bg-muted"}`}>
                              {m.away_score}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground shrink-0">لم تُلعب</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "edit" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <h2 className="text-sm font-semibold text-muted-foreground">شعار الفريق</h2>
              <div className="flex items-center gap-4">
                {displayLogo ? (
                  <div className="relative">
                    <img src={displayLogo} alt="logo" style={{ width: 96, height: 96, objectFit: "cover" }} className="rounded-2xl border-2 border-primary" />
                    {logoPreview && (
                      <button type="button" onClick={clearNewLogo} className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30" style={{ width: 96, height: 96 }}>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                    <Upload className="h-4 w-4" />
                    {displayLogo ? "تغيير الشعار" : "اختر شعار"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">الحد 10 MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الفريق</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={saving} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">الفئة</Label>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="">غير محدد</option>
                    <option value="U8">تحت 8</option>
                    <option value="U10">تحت 10</option>
                    <option value="U12">تحت 12</option>
                    <option value="U14">تحت 14</option>
                    <option value="U16">تحت 16</option>
                    <option value="U18">تحت 18</option>
                    <option value="U20">تحت 20</option>
                    <option value="Senior">الفريق الأول</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="season">الموسم</Label>
                  <Input id="season" value={season} onChange={(e) => setSeason(e.target.value)} disabled={saving} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="headCoach">المدرب الرئيسي</Label>
                <select id="headCoach" value={headCoachId} onChange={(e) => setHeadCoachId(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="">بدون مدرب</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} · {ROLE_LABELS[c.role] || c.role}
                    </option>
                  ))}
                </select>
                {coaches.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">لا يوجد مدربون — أضفهم من صفحة المدربين</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">وصف مختصر</Label>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} rows={3} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" />
              </div>
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
            <Trash2 className="h-4 w-4" />
            {deleting ? "جاري الحذف..." : "حذف الفريق"}
          </Button>
        </div>
      </div>
    </div>
  );
}
