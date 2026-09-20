"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Upload, X, Users, Edit3, BarChart3, Calendar, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PlayerAttendance } from "@/components/features/PlayerAttendance";
import { PlayerMatchStats } from "@/components/features/PlayerMatchStats";
import { PlayerSuspension } from "@/components/features/PlayerSuspension";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POSITIONS = ["حارس مرمى", "قلب دفاع", "ظهير أيمن", "ظهير أيسر", "وسط مدافع", "وسط", "وسط هجومي", "جناح أيمن", "جناح أيسر", "مهاجم"];

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  position: string | null;
  preferred_foot: string | null;
  jersey_number: number | null;
  status: string;
  team_id: string | null;
  photo_url: string | null;
};

type Team = { id: string; name: string; logo_url: string | null };
type Tab = "overview" | "edit";

export default function PlayerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [status, setStatus] = useState("active");
  const [teamId, setTeamId] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase.from("players").select("*").eq("id", id).single();
      if (error || !data) { setError("اللاعب غير موجود"); setLoading(false); return; }
      const p = data as Player;
      setPlayer(p);

      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (members && members.length > 0) {
        const { data: t } = await supabase.from("teams").select("id, name, logo_url").eq("academy_id", members[0].academy_id).order("name");
        setTeams(t || []);
        if (p.team_id) {
          const found = (t || []).find((x) => x.id === p.team_id);
          setCurrentTeam(found || null);
        }
      }

      setFirstName(p.first_name);
      setLastName(p.last_name);
      setDateOfBirth(p.date_of_birth || "");
      setNationality(p.nationality || "");
      setPosition(p.position || "");
      setPreferredFoot(p.preferred_foot || "");
      setJerseyNumber(p.jersey_number?.toString() || "");
      setStatus(p.status);
      setTeamId(p.team_id || "");
      setPhotoUrl(p.photo_url);
      setLoading(false);
    }
    if (id) load();
  }, [id, router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("حجم الصورة كبير (الحد 10MB)"); return; }
    setNewPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearNewPhoto() {
    setNewPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    let finalPhotoUrl = photoUrl;

    if (newPhotoFile) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
        if (members && members.length > 0) {
          const aid = members[0].academy_id;
          const ext = newPhotoFile.name.split(".").pop() || "jpg";
          const fileName = `${aid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("players").upload(fileName, newPhotoFile);
          if (uploadError) { setError("فشل رفع الصورة: " + uploadError.message); setSaving(false); return; }
          const { data: { publicUrl } } = supabase.storage.from("players").getPublicUrl(fileName);
          finalPhotoUrl = publicUrl;
        }
      }
    }

    const { error } = await supabase.from("players").update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth || null,
      nationality: nationality.trim() || null,
      position: position || null,
      preferred_foot: preferredFoot || null,
      jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
      status,
      team_id: teamId || null,
      photo_url: finalPhotoUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    setTab("overview");
    setPhotoUrl(finalPhotoUrl);
    setNewPhotoFile(null);
    setPhotoPreview(null);
    setPlayer((prev) => prev ? { ...prev, first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth || null, nationality: nationality || null, position: position || null, preferred_foot: preferredFoot || null, jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null, status, team_id: teamId || null, photo_url: finalPhotoUrl } : null);
    const found = teams.find((t) => t.id === teamId);
    setCurrentTeam(found || null);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("حذف هذا اللاعب؟")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("players").delete().eq("id", id);
    router.push("/dashboard/players");
    router.refresh();
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  }

  if (!player) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">اللاعب غير موجود</p>
        <Link href="/dashboard/players" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
      </div>
    );
  }

  const displayPhoto = photoPreview || photoUrl;
  const age = player.date_of_birth ? Math.floor((Date.now() - new Date(player.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const statusLabel = player.status === "active" ? "نشط" : player.status === "inactive" ? "غير نشط" : "تجريبي";
  const footLabel = player.preferred_foot === "right" ? "يمنى" : player.preferred_foot === "left" ? "يسرى" : player.preferred_foot === "both" ? "كلتا القدمين" : "—";

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard/players" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للاعبين
        </Link>

        {/* Hero */}
        <div className="mb-6 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="flex items-start gap-4">
            {displayPhoto ? (
              <img src={displayPhoto} alt={`${player.first_name} ${player.last_name}`} style={{ width: 80, height: 80, objectFit: "cover" }} className="rounded-2xl border-2 border-primary shrink-0" />
            ) : (
              <div className="rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 text-2xl font-bold text-primary" style={{ width: 80, height: 80 }}>
                {player.first_name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                {player.jersey_number != null && (
                  <span className="font-mono text-sm text-muted-foreground">#{player.jersey_number}</span>
                )}
                <h1 className="text-2xl md:text-3xl font-bold truncate">
                  {player.first_name} {player.last_name}
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {player.position || "بدون مركز"} • {age ? `${age} سنة` : "—"} • {statusLabel}
              </p>
              {currentTeam && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1">
                  {currentTeam.logo_url ? (
                    <img src={currentTeam.logo_url} alt={currentTeam.name} style={{ width: 20, height: 20, objectFit: "cover" }} className="rounded" />
                  ) : (
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <Link href={`/dashboard/teams/${currentTeam.id}`} className="text-xs hover:text-accent">
                    {currentTeam.name}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
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

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Info cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">الجنسية</p>
                <p className="mt-2 text-sm font-medium">{player.nationality || "—"}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">القدم المفضلة</p>
                <p className="mt-2 text-sm font-medium">{footLabel}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">تاريخ الميلاد</p>
                <p className="mt-2 text-sm font-medium font-mono">{player.date_of_birth || "—"}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">الحالة</p>
                <p className="mt-2 text-sm font-medium">{statusLabel}</p>
              </div>
            </div>

            {/* Match Stats */}
            <section>
              <div className="mb-3 flex items-baseline gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">MATCH STATS</h2>
              </div>
              <PlayerSuspension playerId={id} academyId={player?.team_id ? "" : ""} />
              <PlayerMatchStats playerId={id} />
            </section>

            {/* Attendance */}
            <section>
              <div className="mb-3 flex items-baseline gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">ATTENDANCE LOG</h2>
              </div>
              <PlayerAttendance playerId={id} />
            </section>
          </div>
        )}

        {/* Edit */}
        {tab === "edit" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <h2 className="text-sm font-semibold text-muted-foreground">صورة اللاعب</h2>
              <div className="flex items-center gap-4">
                {displayPhoto ? (
                  <div className="relative">
                    <img src={displayPhoto} alt="player" style={{ width: 96, height: 96, objectFit: "cover" }} className="rounded-full border-2 border-primary" />
                    {photoPreview && (
                      <button type="button" onClick={clearNewPhoto} className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-full border-2 border-dashed bg-muted/30" style={{ width: 96, height: 96 }}>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                    <Upload className="h-4 w-4" />
                    {displayPhoto ? "تغيير الصورة" : "اختر صورة"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">الحد 10 MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <h2 className="text-sm font-semibold text-muted-foreground">المعلومات الأساسية</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="firstName">الاسم الأول</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={saving} /></div>
                <div className="space-y-2"><Label htmlFor="lastName">اسم العائلة</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={saving} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="dob">تاريخ الميلاد</Label><Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={saving} /></div>
                <div className="space-y-2"><Label htmlFor="nationality">الجنسية</Label><Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} disabled={saving} /></div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <h2 className="text-sm font-semibold text-muted-foreground">المعلومات الكروية</h2>
              <div className="space-y-2">
                <Label htmlFor="team">الفريق</Label>
                <select id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="">بدون فريق</option>
                  {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position">المركز</Label>
                  <select id="position" value={position} onChange={(e) => setPosition(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="">اختر المركز</option>
                    {POSITIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foot">القدم المفضلة</Label>
                  <select id="foot" value={preferredFoot} onChange={(e) => setPreferredFoot(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="">غير محدد</option>
                    <option value="right">يمنى</option>
                    <option value="left">يسرى</option>
                    <option value="both">كلتا القدمين</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="jersey">رقم القميص</Label><Input id="jersey" type="number" min="1" max="99" value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} disabled={saving} dir="ltr" /></div>
                <div className="space-y-2">
                  <Label htmlFor="status">الحالة</Label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                    <option value="trial">تجريبي</option>
                  </select>
                </div>
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
            {deleting ? "جاري الحذف..." : "حذف اللاعب"}
          </Button>
        </div>
      </div>
    </div>
  );
}
