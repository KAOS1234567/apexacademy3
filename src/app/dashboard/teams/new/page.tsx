"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewTeamPage() {
  const router = useRouter();
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");

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
      setAcademyId(members[0].academy_id);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!academyId) return;

    if (name.trim().length < 2) { setError("اسم الفريق مطلوب"); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("teams").insert({
      academy_id: academyId,
      name: name.trim(),
      category: category || null,
      season: season.trim() || null,
      description: description.trim() || null,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard/teams");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/teams" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          رجوع للفرق
        </Link>

        <h1 className="mb-2 text-2xl font-bold">إضافة فريق جديد</h1>
        <p className="mb-8 text-sm text-muted-foreground">أنشئ فريقاً لتنظيم لاعبيك</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الفريق *</Label>
              <Input id="name" placeholder="مثال: فريق تحت 15" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">الفئة</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
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
                <Input id="season" placeholder="مثال: 2026/2027" value={season} onChange={(e) => setSeason(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف مختصر</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
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
              {loading ? "جاري الحفظ..." : "حفظ الفريق"}
            </Button>
            <Link href="/dashboard/teams">
              <Button type="button" variant="outline" disabled={loading}>إلغاء</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
