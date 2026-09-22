"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Team = { id: string; name: string };

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [sessionType, setSessionType] = useState("training");
  const [teamId, setTeamId] = useState("");
  const [sessionDate, setSessionDate] = useState(dateParam || "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members")
        .select("academy_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      const aid = members[0].academy_id;
      setAcademyId(aid);

      const { data: t } = await supabase
        .from("teams")
        .select("id, name")
        .eq("academy_id", aid);
      setTeams(t || []);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!academyId) return;

    if (!sessionDate) { setError("التاريخ مطلوب"); return; }

    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("training_sessions").insert({
      academy_id: academyId,
      team_id: teamId || null,
      title: title.trim() || null,
        session_type: sessionType,
      session_date: sessionDate,
      start_time: startTime || null,
      end_time: endTime || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
      created_by: user?.id,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard/schedule");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/schedule" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          رجوع للجدول
        </Link>

        <h1 className="mb-2 text-2xl font-bold">جلسة جديدة</h1>
        <p className="mb-8 text-sm text-muted-foreground">أنشئ جلسة تدريب لتسجيل الحضور</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">التاريخ *</Label>
                <Input id="date" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">الفريق</Label>
                <select
                  id="team"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">بدون فريق</option>
                  {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
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
              {[
                { v: "training", e: "🎯", l: "تدريب" },
                { v: "match",    e: "🏆", l: "مباراة" },
                { v: "cup",      e: "🏅", l: "كأس"   },
                { v: "rest",     e: "💤", l: "راحة"  },
                { v: "meeting",  e: "📋", l: "اجتماع" },
              ].map((opt) => {
                const active = sessionType === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setSessionType(opt.v)}
                    disabled={loading}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2.5 text-[11px] font-medium transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                    } disabled:opacity-50`}
                  >
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
              <Label htmlFor="location">المكان</Label>
              <Input id="location" placeholder="مثال: الملعب الرئيسي" value={location} onChange={(e) => setLocation(e.target.value)} disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ الجلسة"}
            </Button>
            <Link href="/dashboard/schedule">
              <Button type="button" variant="outline" disabled={loading}>إلغاء</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
