"use client";

import { useEffect, useState } from "react";
import { PlayerAttendance } from "@/components/features/PlayerAttendance";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Trash2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POSITIONS = [
  "حارس مرمى", "قلب دفاع", "ظهير أيمن", "ظهير أيسر",
  "وسط مدافع", "وسط", "وسط هجومي",
  "جناح أيمن", "جناح أيسر", "مهاجم",
];

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
};

export default function PlayerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("اللاعب غير موجود");
        setLoading(false);
        return;
      }

      const p = data as Player;
      setPlayer(p);
      setFirstName(p.first_name);
      setLastName(p.last_name);
      setDateOfBirth(p.date_of_birth || "");
      setNationality(p.nationality || "");
      setPosition(p.position || "");
      setPreferredFoot(p.preferred_foot || "");
      setJerseyNumber(p.jersey_number?.toString() || "");
      setStatus(p.status);
      setLoading(false);
    }

    if (id) load();
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("players")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth || null,
        nationality: nationality.trim() || null,
        position: position || null,
        preferred_foot: preferredFoot || null,
        jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/dashboard/players");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("هل أنت متأكد من حذف هذا اللاعب؟ لا يمكن التراجع.")) return;

    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("players").delete().eq("id", id);

    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }

    router.push("/dashboard/players");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">اللاعب غير موجود</p>
        <Link href="/dashboard/players" className="mt-4 inline-block">
          <Button variant="outline">رجوع</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/players"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع للاعبين
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {player.first_name} {player.last_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {player.position || "بدون مركز"} • {player.status}
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
            <h2 className="text-sm font-semibold text-muted-foreground">
              المعلومات الأساسية
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">الاسم الأول</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">اسم العائلة</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dob">تاريخ الميلاد</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">الجنسية</Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold text-muted-foreground">
              المعلومات الكروية
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="position">المركز</Label>
                <select
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">اختر المركز</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foot">القدم المفضلة</Label>
                <select
                  id="foot"
                  value={preferredFoot}
                  onChange={(e) => setPreferredFoot(e.target.value)}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">غير محدد</option>
                  <option value="right">يمنى</option>
                  <option value="left">يسرى</option>
                  <option value="both">كلتا القدمين</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jersey">رقم القميص</Label>
                <Input
                  id="jersey"
                  type="number"
                  min="1"
                  max="99"
                  value={jerseyNumber}
                  onChange={(e) => setJerseyNumber(e.target.value)}
                  disabled={saving}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={saving}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="trial">تجريبي</option>
                </select>
              </div>
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
            <Link href="/dashboard/players">
              <Button type="button" variant="outline" disabled={saving}>
                إلغاء
              </Button>
            </Link>
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
