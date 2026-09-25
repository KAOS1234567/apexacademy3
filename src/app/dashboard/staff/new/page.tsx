"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDict } from "@/i18n/DictProvider";
import { staffDict } from "@/i18n/staff";

export default function NewStaffPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { locale } = useDict();
  const d = staffDict[locale as keyof typeof staffDict] || staffDict.ar;
  const f = d.form;

  const [academyId, setAcademyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("coach");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      setAcademyId(members[0].academy_id);
    }
    load();
  }, [router]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError(f.errImageSize); return; }
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
    if (fullName.trim().length < 2) { setError(f.errName); return; }

    setLoading(true);
    const supabase = createClient();

    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop() || "jpg";
      const fileName = `staff/${academyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("players").upload(fileName, photoFile);
      if (upErr) { setError(f.errUpload + upErr.message); setLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("players").getPublicUrl(fileName);
      photoUrl = publicUrl;
    }

    const { error: err } = await supabase.from("staff").insert({
      academy_id: academyId, full_name: fullName.trim(), role,
      phone: phone.trim() || null, email: email.trim() || null,
      joined_at: joinedAt || null, status, notes: notes.trim() || null, photo_url: photoUrl,
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push("/dashboard/staff");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/staff" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />{f.back}
        </Link>

        <h1 className="mb-2 text-2xl font-bold">{f.title}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{f.subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">{f.photoSection}</h2>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="preview" className="h-24 w-24 rounded-full object-cover border-2 border-primary" />
                  <button type="button" onClick={clearPhoto} className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed bg-muted/30"><Upload className="h-6 w-6 text-muted-foreground" /></div>
              )}
              <div className="flex-1">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                  <Upload className="h-4 w-4" />{photoFile ? f.changePhoto : f.choosePhoto}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">{f.photoLimit}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2"><Label htmlFor="fullName">{f.fullName}</Label><Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loading} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">{f.role}</Label>
                <select id="role" value={role} onChange={(e) => setRole(e.target.value)} disabled={loading} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="head_coach">{d.roleHeadCoach}</option>
                  <option value="coach">{d.roleCoach}</option>
                  <option value="assistant_coach">{d.roleAssistant}</option>
                  <option value="analyst">{d.roleAnalyst}</option>
                  <option value="medical">{d.roleMedical}</option>
                  <option value="accountant">{d.roleAccountant}</option>
                  <option value="staff">{d.roleStaff}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">{f.status}</Label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="active">{d.active}</option>
                  <option value="inactive">{d.inactive}</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="phone">{f.phone}</Label><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} dir="ltr" /></div>
              <div className="space-y-2"><Label htmlFor="email">{f.email}</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} dir="ltr" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="joinedAt">{f.joinedAt}</Label><Input id="joinedAt" type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} disabled={loading} /></div>
            <div className="space-y-2">
              <Label htmlFor="notes">{f.notes}</Label>
              <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={loading} className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" />
            </div>
          </div>

          {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>)}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>{loading ? f.saving : f.save}</Button>
            <Link href="/dashboard/staff"><Button type="button" variant="outline" disabled={loading}>{f.cancel}</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
