"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EditLeaguePage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [format, setFormat] = useState<"league" | "groups">("league");
  const [legs, setLegs] = useState<1 | 2>(1);
  const [status, setStatus] = useState<"draft" | "active" | "finished">("draft");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("leagues")
        .select("id, name, season, format, legs, status")
        .eq("id", leagueId)
        .maybeSingle();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      setName(data.name || "");
      setSeason(data.season || "");
      setFormat((data.format as "league" | "groups") || "league");
      setLegs((data.legs as 1 | 2) || 1);
      setStatus((data.status as "draft" | "active" | "finished") || "draft");
      setLoading(false);
    }
    load();
  }, [leagueId, router]);

  async function handleDelete() {
    if (deleteConfirm.trim() !== name.trim()) {
      setDeleteError("اسم الدوري غير مطابق");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    const supabase = createClient();
    const { error: delError } = await supabase
      .from("leagues")
      .delete()
      .eq("id", leagueId);
    if (delError) {
      setDeleteError(delError.message);
      setDeleting(false);
      return;
    }
    router.push("/dashboard/leagues");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("leagues")
      .update({
        name: name.trim(),
        season: season.trim() || null,
        format,
        legs,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leagueId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push(`/dashboard/leagues/${leagueId}`);
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
          <h3 className="mb-2 text-lg font-semibold">الدوري غير موجود</h3>
          <Link href="/dashboard/leagues">
            <Button variant="outline"><ArrowRight className="h-4 w-4" /> العودة للدوريات</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <Link href={`/dashboard/leagues/${leagueId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="h-4 w-4" /> العودة للدوري
      </Link>

      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">تعديل الدوري</h1>
          <p className="text-sm text-muted-foreground">حدّث تفاصيل الدوري</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الدوري *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                required disabled={saving} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="season">الموسم</Label>
              <Input id="season" value={season} onChange={(e) => setSeason(e.target.value)}
                disabled={saving} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="format">النظام</Label>
                <select id="format" value={format}
                  onChange={(e) => setFormat(e.target.value as "league" | "groups")}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="league">دوري عادي</option>
                  <option value="groups">مجموعات</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="legs">الصيغة</Label>
                <select id="legs" value={legs}
                  onChange={(e) => setLegs(Number(e.target.value) as 1 | 2)}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value={1}>ذهاب فقط</option>
                  <option value={2}>ذهاب وإياب</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">الحالة</Label>
              <select id="status" value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "active" | "finished")}
                disabled={saving}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                <option value="draft">مسودة</option>
                <option value="active">نشط</option>
                <option value="finished">منتهي</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Link href={`/dashboard/leagues/${leagueId}`}>
              <Button type="button" variant="outline" disabled={saving}>إلغاء</Button>
            </Link>
          </div>
        </form>

        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="mb-1 font-semibold text-destructive">منطقة الخطر</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            حذف الدوري سيحذف كل مبارياته وفرقه المشاركة. لا يمكن التراجع.
          </p>

          {!showDelete ? (
            <Button type="button" variant="outline"
              onClick={() => { setShowDelete(true); setDeleteConfirm(""); setDeleteError(""); }}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="h-4 w-4" /> حذف الدوري
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="deleteConfirm" className="text-sm">
                  اكتب اسم الدوري <span className="font-mono font-semibold">"{name}"</span> للتأكيد:
                </Label>
                <Input id="deleteConfirm" value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={name} disabled={deleting} />
              </div>
              {deleteError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirm.trim() !== name.trim()}>
                  {deleting ? "جاري الحذف..." : "حذف نهائي"}
                </Button>
                <Button type="button" variant="outline"
                  onClick={() => { setShowDelete(false); setDeleteConfirm(""); setDeleteError(""); }}
                  disabled={deleting}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
