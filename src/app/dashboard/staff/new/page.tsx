"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewStaffPage() {
  const router = useRouter();
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

    if (fullName.trim().length < 2) { setError("اسم المدرب مطلوب"); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("staff").insert({
      academy_id: academyId,
      full_name: fullName.trim(),
      role,
      phone: phone.trim() || null,
      email: email.trim() || null,
      joined_at: joinedAt || null,
      status,
      notes: notes.trim() || null,
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard/staff");
    router.refresh();
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/staff" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
          رجوع للمدربين
        </Link>

        <h1 className="mb-2 text-2xl font-bold">إضافة مدرب جديد</h1>
        <p className="mb-8 text-sm text-muted-foreground">أضف بيانات المدرب أو الإداري</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loading} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">الدور</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
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
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} dir="ltr" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinedAt">تاريخ الانضمام</Label>
              <Input id="joinedAt" type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} disabled={loading} />
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
              {loading ? "جاري الحفظ..." : "حفظ المدرب"}
            </Button>
            <Link href="/dashboard/staff">
              <Button type="button" variant="outline" disabled={loading}>إلغاء</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
