"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POSITIONS = ["حارس مرمى", "قلب دفاع", "ظهير أيمن", "ظهير أيسر", "وسط مدافع", "وسط", "وسط هجومي", "جناح أيمن", "جناح أيسر", "مهاجم"];
type Team = { id: string; name: string };

export default function NewPlayerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [academyId, setAcademyId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [status, setStatus] = useState("active");
  const [teamId, setTeamId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      const aid = members[0].academy_id;
      setAcademyId(aid);
      const { data: t } = await supabase.from("teams").select("id, name").eq("academy_id", aid);
      setTeams(t || []);
    }
    load();
  }, [router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("حجم الصورة كبير (الحد 10MB)"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!academyId) return;
    if (firstName.trim().length < 2 || lastName.trim().length < 2) { setError("الاسم الأول والعائلة مطلوبان"); return; }

    setLoading(true);
    const supabase = createClient();

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const fileName = `${academyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("players").upload(fileName, photoFile);
      if (uploadError) { setError("فشل رفع الصورة: " + uploadError.message); setLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("players").getPublicUrl(fileName);
      photoUrl = publicUrl;
    }

    const { error } = await supabase.from("players").insert({
      academy_id: academyId,
      team_id: teamId || null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth || null,
      nationality: nationality.trim() || null,
      position: position || null,
      preferred_foot: preferredFoot || null,
      jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
      status,
      photo_url: photoUrl,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard/players");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/players" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للاعبين
        </Link>

        <h1 className="mb-2 text-2xl font-bold">إضافة لاعب جديد</h1>
        <p className="mb-8 text-sm text-muted-foreground">املأ بيانات اللاعب الأساسية</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* صورة اللاعب */}
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">صورة اللاعب</h2>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="preview" className="h-24 w-24 rounded-full object-cover border-2 border-primary" />
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed bg-muted/30">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="h-4 w-4" />
                  {photoFile ? "تغيير الصورة" : "اختر صورة"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">صورة شخصية (اختياري) — الحد 10 MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">المعلومات الأساسية</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="firstName">الاسم الأول *</Label><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={loading} /></div>
              <div className="space-y-2"><Label htmlFor="lastName">اسم العائلة *</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={loading} /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="dob">تاريخ الميلاد</Label><Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} disabled={loading} /></div>
              <div className="space-y-2"><Label htmlFor="nationality">الجنسية</Label><Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} disabled={loading} /></div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">المعلومات الكروية</h2>
            <div className="space-y-2">
              <Label htmlFor="team">الفريق</Label>
              <select id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={loading} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                <option value="">بدون فريق</option>
                {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="position">المركز</Label>
                <select id="position" value={position} onChange={(e) => setPosition(e.target.value)} disabled={loading} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="">اختر المركز</option>
                  {POSITIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="foot">القدم المفضلة</Label>
                <select id="foot" value={preferredFoot} onChange={(e) => setPreferredFoot(e.target.value)} disabled={loading} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="">غير محدد</option>
                  <option value="right">يمنى</option>
                  <option value="left">يسرى</option>
                  <option value="both">كلتا القدمين</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="jersey">رقم القميص</Label><Input id="jersey" type="number" min="1" max="99" value={jerseyNumber} onChange={(e) => setJerseyNumber(e.target.value)} disabled={loading} dir="ltr" /></div>
              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="trial">تجريبي</option>
                </select>
              </div>
            </div>
          </div>

          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>)}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>{loading ? "جاري الحفظ..." : "حفظ اللاعب"}</Button>
            <Link href="/dashboard/players"><Button type="button" variant="outline" disabled={loading}>إلغاء</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
