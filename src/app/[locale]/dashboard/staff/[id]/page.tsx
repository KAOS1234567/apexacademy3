"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Upload, X, Users, Edit3, BarChart3, Phone, Mail, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_LABELS: Record<string, string> = {
  head_coach: "مدرب رئيسي", coach: "مدرب", assistant_coach: "مدرب مساعد",
  analyst: "محلل", medical: "طبي", accountant: "محاسب", staff: "إداري",
};

type Staff = {
  id: string; full_name: string; role: string; phone: string | null; email: string | null;
  joined_at: string | null; status: string; notes: string | null; photo_url: string | null;
};

type TeamLed = { id: string; name: string; category: string | null; logo_url: string | null };

type Tab = "overview" | "edit";

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [teams, setTeams] = useState<TeamLed[]>([]);
  const [tab, setTab] = useState<Tab>("overview");

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("coach");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("staff").select("*").eq("id", id).single();
      if (error || !data) { setError("المدرب غير موجود"); setLoading(false); return; }
      const s = data as Staff;
      setStaff(s);
      setFullName(s.full_name);
      setRole(s.role);
      setPhone(s.phone || "");
      setEmail(s.email || "");
      setJoinedAt(s.joined_at || "");
      setStatus(s.status);
      setNotes(s.notes || "");
      setPhotoUrl(s.photo_url);

      const { data: led } = await supabase
        .from("teams")
        .select("id, name, category, logo_url")
        .eq("head_coach_id", id)
        .order("name");
      setTeams(led || []);

      setLoading(false);
    }
    if (id) load();
  }, [id]);

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
          const fileName = `staff/${aid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("players").upload(fileName, newPhotoFile);
          if (uploadError) { setError("فشل رفع الصورة: " + uploadError.message); setSaving(false); return; }
          const { data: { publicUrl } } = supabase.storage.from("players").getPublicUrl(fileName);
          finalPhotoUrl = publicUrl;
        }
      }
    }

    const { error } = await supabase.from("staff").update({
      full_name: fullName.trim(), role, phone: phone.trim() || null, email: email.trim() || null,
      joined_at: joinedAt || null, status, notes: notes.trim() || null, photo_url: finalPhotoUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    setTab("overview");
    setPhotoUrl(finalPhotoUrl);
    setNewPhotoFile(null);
    setPhotoPreview(null);
    setStaff((prev) => prev ? { ...prev, full_name: fullName, role, phone: phone || null, email: email || null, joined_at: joinedAt || null, status, notes: notes || null, photo_url: finalPhotoUrl } : null);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("حذف هذا المدرب؟")) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("staff").delete().eq("id", id);
    router.push("/dashboard/staff");
    router.refresh();
  }

  if (loading) return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  if (!staff) return (
    <div className="p-10 text-center">
      <p className="text-muted-foreground">المدرب غير موجود</p>
      <Link href="/dashboard/staff" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
    </div>
  );

  const displayPhoto = photoPreview || photoUrl;
  const roleLabel = ROLE_LABELS[staff.role] || staff.role;
  const statusLabel = staff.status === "active" ? "نشط" : "غير نشط";

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard/staff" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للمدربين
        </Link>

        {/* Hero */}
        <div className="mb-6 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="flex items-start gap-4">
            {displayPhoto ? (
              <img src={displayPhoto} alt={staff.full_name} style={{ width: 80, height: 80, objectFit: "cover" }} className="rounded-full border-2 border-primary shrink-0" />
            ) : (
              <div className="rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-2xl font-bold text-primary" style={{ width: 80, height: 80 }}>
                {staff.full_name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold truncate">{staff.full_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{roleLabel} • {statusLabel}</p>
              {teams.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <Link key={t.id} href={`/dashboard/teams/${t.id}`} className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 hover:border-accent transition-colors">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} style={{ width: 20, height: 20, objectFit: "cover" }} className="rounded" />
                      ) : (
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs">{t.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
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
            {/* Info cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Phone className="h-3.5 w-3.5" />
                  <p className="text-xs">الهاتف</p>
                </div>
                <p className="text-sm font-medium font-mono" dir="ltr">{staff.phone || "—"}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Mail className="h-3.5 w-3.5" />
                  <p className="text-xs">البريد</p>
                </div>
                <p className="text-sm font-medium font-mono truncate" dir="ltr">{staff.email || "—"}</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <p className="text-xs">تاريخ الانضمام</p>
                </div>
                <p className="text-sm font-medium font-mono">{staff.joined_at || "—"}</p>
              </div>
            </div>

            {/* Teams */}
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">TEAMS LEADING</h2>
                <Link href="/dashboard/teams" className="text-xs text-accent hover:underline">كل الفرق ←</Link>
              </div>
              {teams.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
                  <p className="text-sm text-muted-foreground">لا يقود أي فريق حالياً</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {teams.map((t) => (
                    <Link key={t.id} href={`/dashboard/teams/${t.id}`} className="rounded-xl border bg-card p-4 hover:border-accent transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        {t.logo_url ? (
                          <img src={t.logo_url} alt={t.name} style={{ width: 36, height: 36, objectFit: "cover" }} className="rounded-lg" />
                        ) : (
                          <div className="rounded-lg bg-primary/15 flex items-center justify-center" style={{ width: 36, height: 36 }}>
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.category || "بدون فئة"}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Notes */}
            {staff.notes && (
              <section>
                <h2 className="mb-3 text-sm font-mono uppercase tracking-wider text-muted-foreground">NOTES</h2>
                <div className="rounded-2xl border bg-card p-4">
                  <p className="text-sm whitespace-pre-wrap">{staff.notes}</p>
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "edit" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <h2 className="text-sm font-semibold text-muted-foreground">صورة المدرب</h2>
              <div className="flex items-center gap-4">
                {displayPhoto ? (
                  <div className="relative">
                    <img src={displayPhoto} alt="staff" style={{ width: 96, height: 96, objectFit: "cover" }} className="rounded-full border-2 border-primary" />
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
                    <Upload className="h-4 w-4" />{displayPhoto ? "تغيير الصورة" : "اختر صورة"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">الحد 10 MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <div className="space-y-2"><Label htmlFor="fullName">الاسم الكامل</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={saving} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">الدور</Label>
                  <select id="role" value={role} onChange={(e) => setRole(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="head_coach">مدرب رئيسي</option>
                    <option value="coach">مدرب</option>
                    <option value="assistant_coach">مدرب مساعد</option>
                    <option value="analyst">محلل</option>
                    <option value="medical">طبي</option>
                    <option value="accountant">محاسب</option>
                    <option value="staff">إداري</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">الحالة</Label>
                  <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="phone">رقم الهاتف</Label><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} dir="ltr" /></div>
                <div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} dir="ltr" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="joinedAt">تاريخ الانضمام</Label><Input id="joinedAt" type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} disabled={saving} /></div>
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" />
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
            <Trash2 className="h-4 w-4" />{deleting ? "جاري الحذف..." : "حذف المدرب"}
          </Button>
        </div>
      </div>
    </div>
  );
}
