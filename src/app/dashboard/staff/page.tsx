"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDict } from "@/i18n/DictProvider";
import { staffDict } from "@/i18n/staff";

type Staff = { id: string; full_name: string; role: string; status: string; phone: string | null; photo_url: string | null };

export default function StaffPage() {
  const router = useRouter();
  const { locale } = useDict();
  const s = staffDict[locale as keyof typeof staffDict] || staffDict.ar;

  const ROLE_LABELS: Record<string, string> = {
    head_coach: s.roleHeadCoach, coach: s.roleCoach, assistant_coach: s.roleAssistant,
    analyst: s.roleAnalyst, medical: s.roleMedical, accountant: s.roleAccountant, staff: s.roleStaff,
  };

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
      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      const { data } = await supabase.from("staff").select("id, full_name, role, status, phone, photo_url").eq("academy_id", members[0].academy_id).order("created_at", { ascending: false });
      setStaff(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">···</p></div>;

  const filtered = staff.filter((m) => {
    if (roleFilter && m.role !== roleFilter) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    if (searchQuery.trim() && !m.full_name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{s.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} {s.showingOf} {staff.length} {s.staffWord}</p>
        </div>
        <Link href="/dashboard/staff/new"><Button><Plus className="h-4 w-4" />{s.addStaff}</Button></Link>
      </div>

      {staff.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={s.searchPlaceholder} />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">{s.allRoles}</option>
            <option value="head_coach">{s.roleHeadCoach}</option>
            <option value="coach">{s.roleCoach}</option>
            <option value="assistant_coach">{s.roleAssistant}</option>
            <option value="analyst">{s.roleAnalyst}</option>
            <option value="medical">{s.roleMedical}</option>
            <option value="accountant">{s.roleAccountant}</option>
            <option value="staff">{s.roleStaff}</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">{s.allStatuses}</option>
            <option value="active">{s.active}</option>
            <option value="inactive">{s.inactive}</option>
          </select>
        </div>
      )}

      {staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Dumbbell className="h-6 w-6 text-muted-foreground" /></div>
          <h3 className="mb-2 text-lg font-semibold">{s.noStaff}</h3>
          <p className="mb-6 text-sm text-muted-foreground">{s.noStaffDesc}</p>
          <Link href="/dashboard/staff/new"><Button><Plus className="h-4 w-4" />{s.addStaff}</Button></Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center"><p className="text-sm text-muted-foreground">— {s.emptyFilter} —</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} href={`/dashboard/staff/${m.id}`} className="rounded-2xl border bg-card p-5 transition hover:border-primary/50">
              <div className="mb-3 flex items-center gap-3">
                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.full_name} className="h-12 w-12 rounded-full object-cover border border-border" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary text-lg font-bold">{m.full_name.charAt(0)}</div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{m.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] || m.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={m.status === "active" ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] text-emerald-500" : "rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground"}>
                  {m.status === "active" ? s.active : s.inactive}
                </span>
                {m.phone && (<span className="text-xs text-muted-foreground" dir="ltr">{m.phone}</span>)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
