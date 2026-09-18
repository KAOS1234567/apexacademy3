"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save } from "lucide-react";
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
};

export default function TeamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");

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
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("teams").update({
      name: name.trim(),
      category: category || null,
      season: season.trim() || null,
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false);
    router.push("/dashboard/teams");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("هل أنت متأكد من حذف هذا الفريق؟")) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) { setError(error.message); setDeleting(false); return; }
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

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/teams" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          رجوع للفرق
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {team.category || "بدون فئة"} • {team.season || "بدون موسم"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "جاري الحذف..." : "حذف"}
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الفريق</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={saving} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">الفئة</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={saving}
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
                <Input id="season" value={season} onChange={(e) => setSeason(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">وصف مختصر</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
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
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Link href="/dashboard/teams">
              <Button type="button" variant="outline" disabled={saving}>إلغاء</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
