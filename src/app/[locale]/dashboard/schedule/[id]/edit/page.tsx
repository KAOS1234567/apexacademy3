"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Team = { id: string; name: string };

const TYPES = [
  { v: "training", e: "🎯", l: "تدريب" },
  { v: "match",    e: "🏆", l: "مباراة" },
  { v: "cup",      e: "🏅", l: "كأس"   },
  { v: "rest",     e: "💤", l: "راحة"  },
  { v: "meeting",  e: "📋", l: "اجتماع" },
];

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [sessionType, setSessionType] = useState("training");
  const [teamId, setTeamId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members").select("academy_id")
        .eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const { data: s, error: sErr } = await supabase
        .from("training_sessions")
        .select("id, title, session_type, team_id, session_date, start_time, end_time, location, notes")
        .eq("id", sessionId).maybeSingle();

      if (sErr || !s) { setNotFound(true); setLoading(false); return; }

      setTitle(s.title || "");
      setSessionType(s.session_type || "training");
      setTeamId(s.team_id || "");
      setSessionDate(s.session_date || "");
      setStartTime(s.start_time ? s.start_time.slice(0, 5) : "");
      setEndTime(s.end_time ? s.end_time.slice(0, 5) : "");
      setLocation(s.location || "");
      setNotes(s.notes || "");

      const { data: t } = await supabase
        .from("teams").select("id, name")
        .eq("academy_id", members[0].academy_id);
      setTeams(t || []);
      setLoading(false);
    }
    load();
  }, [sessionId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const supabase = createClient();
    const { error: uErr } = await supabase
      .from("training_sessions")
      .update({
        title: title.trim() || null,
        session_type: sessionType,
        team_id: teamId || null,
        session_date: sessionDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    if (uErr) { setError(uErr.message); setSaving(false); return; }
    router.push("/dashboard/schedule");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    const { error: dErr } = await supabase
      .from("training_sessions").delete().eq("id", sessionId);
    if (dErr) { setError(dErr.message); setDeleting(false); return; }
    router.push("/dashboard/schedule");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">الجلسة غير موجودة</h3>
          <Link href="/dashboard/schedule">
            <Button variant="outline"><ArrowRight className="h-4 w-4" /> العودة للجدول</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/schedule" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" /> رجوع للجدول
        </Link>

        <h1 className="mb-2 text-2xl font-bold">تعديل الجلسة</h1>
        <p className="mb-8 text-sm text-muted-foreground">حدّث تفاصيل الجلسة</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">التاريخ *</Label>
                <Input id="date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">الفريق</Label>
                <select id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                  <option value="">بدون فريق</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">عنوان الجلسة</Label>
              <Input id="title" placeholder="مثال: تدريب لياقة" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label>نوع الجلسة *</Label>
              <div className="grid grid-cols-5 gap-2">
                {TYPES.map((opt) => {
                  const active = sessionType === opt.v;
                  return (
                    <button key={opt.v} type="button" onClick={() => setSessionType(opt.v)} disabled={loading}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2.5 text-[11px] font-medium transition ${
                        active ? "border-primary bg-primary/10 text-primary shadow-sm"
                               : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                      } disabled:opacity-50`}>
                      <span className="text-xl leading-none">{opt.e}</span>
                      <span className="leading-none">{opt.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">بداية</Label>
                <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">نهاية</Label>
                <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc">المكان</Label>
              <Input id="loc" placeholder="مثال: الملعب الرئيسي" value={location} onChange={(e) => setLocation(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={loading} rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50" />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</Button>
            <Link href="/dashboard/schedule">
              <Button type="button" variant="outline" disabled={saving}>إلغاء</Button>
            </Link>
          </div>
        </form>

        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="mb-1 font-semibold text-destructive">منطقة الخطر</h2>
          <p className="mb-4 text-sm text-muted-foreground">حذف الجلسة لا يمكن التراجع عنه.</p>
          {!showDelete ? (
            <Button type="button" variant="outline" onClick={() => setShowDelete(true)}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" /> حذف الجلسة
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "جاري الحذف..." : "تأكيد الحذف"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>إلغاء</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
