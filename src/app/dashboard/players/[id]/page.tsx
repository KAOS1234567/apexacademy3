"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PlayerAttendance } from "@/components/features/PlayerAttendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POSITIONS = ["حارس مرمى", "قلب دفاع", "ظهير أيمن", "ظهير أيسر", "وسط مدافع", "وسط", "وسط هجومي", "جناح أيمن", "جناح أيسر", "مهاجم"];
type Team = { id: string; name: string };

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

      const { data: members } = await supabase
        .from("academy_members")
        .select("academy_id")
        .eq("user_id", user.id)
        .limit(1);

      if (members && members.length > 0) {
        const { data: t } = await supabase
          .from("teams")
          .select("id, name")
          .eq("academy_id", members[0].academy_id)
          .order("name");
        setTeams(t || []);
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

    // ارفع الصورة الجديدة إذا فيه
    if (newPhotoFile && player) {
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
    router.push("/dashboard/players");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("هل أنت متأكد من حذف هذا اللاعب؟")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) { setError(error.message); setDeleting(false); return; }
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

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/players" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للاعبين
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{player.first_name} {player.last_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {player.position || "بدون مركز"} • {player.status}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            {deleting ? "جاري الحذف..." : "حذف"}
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* صورة اللاعب */}
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">صورة اللاعب</h2>
            <div className="flex items-center gap-4">
              {displayPhoto ? (
                <div className="relative">
                  <img src={displayPhoto} alt="player" className="h-28 w-28 rounded-full object-cover border-2 border-primary" />
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={clearNewPhoto}
                      className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed bg-muted/30">
                  <Upload className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                >
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
            <Link href="/dashboard/players"><Button type="button" variant="outline" disabled={saving}>إلغاء</Button></Link>
          </div>
        </form>

        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-bold">سجل الحضور</h2>
          <PlayerAttendance playerId={id} />
        </div>
      </div>
    </div>
  );
}
