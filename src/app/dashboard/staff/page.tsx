"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";

type Staff = {
  id: string;
  full_name: string;
  role: string;
  status: string;
  phone: string | null;
  photo_url: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  head_coach: "مدرب رئيسي",
  coach: "مدرب",
  assistant_coach: "مدرب مساعد",
  analyst: "محلل",
  medical: "طبي",
  accountant: "محاسب",
  staff: "إداري",
};

export default function StaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

      const { data } = await supabase
        .from("staff")
        .select("id, full_name, role, status, phone, photo_url")
        .eq("academy_id", members[0].academy_id)
        .order("created_at", { ascending: false });

      setStaff(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  }

  const filtered = staff.filter((s) => {
    if (roleFilter && s.role !== roleFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!s.full_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المدربين</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} من {staff.length} موظف</p>
        </div>
        <Link href="/dashboard/staff/new">
          <Button><Plus className="h-4 w-4" />إضافة مدرب</Button>
        </Link>
      </div>

      {staff.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="ابحث بالاسم..." />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">كل الأدوار</option>
            <option value="head_coach">مدرب رئيسي</option>
            <option value="coach">مدرب</option>
            <option value="assistant_coach">مدرب مساعد</option>
            <option value="analyst">محلل</option>
            <option value="medical">طبي</option>
            <option value="accountant">محاسب</option>
            <option value="staff">إداري</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">لا يوجد مدربين بعد</h3>
          <p className="mb-6 text-sm text-muted-foreground">أضف أول مدرب لفريقك</p>
          <Link href="/dashboard/staff/new"><Button><Plus className="h-4 w-4" />إضافة مدرب</Button></Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <p className="text-sm text-muted-foreground">— لا يوجد مدربين مطابقين —</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Link key={s.id} href={`/dashboard/staff/${s.id}`} className="rounded-2xl border bg-card p-5 transition hover:border-primary/50">
              <div className="mb-3 flex items-center gap-3">
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.full_name} className="h-12 w-12 rounded-full object-cover border border-border" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary text-lg font-bold">
                    {s.full_name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{s.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[s.role] || s.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={s.status === "active"
                  ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] text-emerald-500"
                  : "rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground"}>
                  {s.status === "active" ? "نشط" : "غير نشط"}
                </span>
                {s.phone && (<span className="text-xs text-muted-foreground" dir="ltr">{s.phone}</span>)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
