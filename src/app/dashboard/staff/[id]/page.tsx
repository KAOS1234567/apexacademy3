"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Staff = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  email: string | null;
  joined_at: string | null;
  status: string;
  notes: string | null;
  photo_url: string | null;
};

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

    if (newPhotoFile && staff) {
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
      full_name: fullName.trim(),
      role,
      phone: phone.trim() || null,
      email: email.trim() || null,
      joined_at: joinedAt || null,
      status,
      notes: notes.trim() || null,
      photo_url: finalPhotoUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    router.push("/dashboard/staff");
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

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  }

  if (!staff) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">المدرب غير موجود</p>
        <Link href="/dashboard/staff" className="mt-4 inline-block"><Button variant="outline">رجوع</Button></Link>
      </div>
    );
  }

  const displayPhoto = photoPreview || photoUrl;

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/staff" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />رجوع للمدربين
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {displayPhoto ? (
              <img src={displayPhoto} alt={staff.full_name} className="h-14 w-14 rounded-full object-cover border-2 border-primary" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary text-xl font-bold">
                {staff.full_name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{staff.full_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {staff.role} • {staff.status === "active" ? "نشط" : "غير نشط"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">صورة المدرب</h2>
            <div className="flex items-center gap-4">
              {displayPhoto ? (
                <div className="relative">
                  <img src={displayPhoto} alt="staff" className="h-28 w-28 rounded-full object-cover border-2 border-primary" />
                  {photoPreview && (
                    <button type="button" onClick={clearNewPhoto} className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={saving} />
            </div>
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
            <Link href="/dashboard/staff"><Button type="button" variant="outline" disabled={saving}>إلغاء</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
