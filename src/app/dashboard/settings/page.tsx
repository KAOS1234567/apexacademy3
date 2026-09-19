"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Settings as SettingsIcon, Users, Shield, Building2, Crown, Dumbbell, User as UserIcon, AlertTriangle, Trash2, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Academy = { id: string; name: string; country: string | null; city: string | null; currency: string; timezone: string | null };
type Member = { id: string; user_id: string; role: string; created_at: string; profiles: { full_name: string | null; avatar_url: string | null } | null };

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك", admin: "مدير", head_coach: "مدرب رئيسي", coach: "مدرب",
  assistant_coach: "مدرب مساعد", analyst: "محلل", medical: "طبي",
  accountant: "محاسب", staff: "إداري",
};

const ROLE_ICONS: Record<string, typeof Crown> = {
  owner: Crown, admin: Shield, head_coach: Dumbbell, coach: Dumbbell,
  assistant_coach: Dumbbell, analyst: Dumbbell, medical: UserIcon,
  accountant: UserIcon, staff: UserIcon,
};

type Tab = "general" | "members" | "advanced";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tab, setTab] = useState<Tab>("general");

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState("USD");

  const [deleteAcademyOpen, setDeleteAcademyOpen] = useState(false);
  const [deleteAcademyInput, setDeleteAcademyInput] = useState("");
  const [deletingAcademy, setDeletingAcademy] = useState(false);

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: membersData } = await supabase
        .from("academy_members")
        .select("academy_id, academies(id, name, country, city, currency, timezone)")
        .eq("user_id", user.id)
        .limit(1);

      if (!membersData || membersData.length === 0) { router.push("/onboarding"); return; }
      const ac = (membersData[0] as unknown as { academies: Academy }).academies;
      setAcademy(ac);
      setName(ac.name);
      setCountry(ac.country || "");
      setCity(ac.city || "");
      setCurrency(ac.currency || "USD");

      const { data: mData } = await supabase
        .from("academy_members")
        .select("id, user_id, role, created_at")
        .eq("academy_id", ac.id)
        .order("created_at");
      const mList = ((mData as unknown) as Member[]) || [];
      if (mList.length > 0) {
        const userIds = mList.map((x) => x.user_id);
        const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", userIds);
        const profMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
        (profs || []).forEach((pr: { id: string; full_name: string | null; avatar_url: string | null }) => { profMap[pr.id] = { full_name: pr.full_name, avatar_url: pr.avatar_url }; });
        mList.forEach((x) => { x.profiles = profMap[x.user_id] || null; });
      }
      setMembers(mList);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!academy) return;
    setError(null); setSuccess(false); setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("academies").update({
      name: name.trim(), country: country.trim() || null, city: city.trim() || null, currency,
      updated_at: new Date().toISOString(),
    }).eq("id", academy.id);
    if (error) { setError(error.message); setSaving(false); return; }
    setSaving(false); setSuccess(true);
    setAcademy({ ...academy, name, country, city, currency });
    setTimeout(() => setSuccess(false), 3000);
    router.refresh();
  }

  async function handleDeleteAcademy() {
    if (!academy) return;
    if (deleteAcademyInput.trim() !== academy.name) { setError("الاسم غير مطابق"); return; }
    setDeletingAcademy(true);
    const supabase = createClient();
    const { error } = await supabase.from("academies").delete().eq("id", academy.id);
    if (error) { setError(error.message); setDeletingAcademy(false); return; }
    setDeleteAcademyOpen(false);
    router.push("/onboarding");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (deleteAccountInput.trim() !== "حذف") { setError("اكتب كلمة 'حذف' للتأكيد"); return; }
    setDeletingAccount(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setError(error.message); setDeletingAccount(false); return; }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">جاري التحميل...</p></div>;
  if (!academy) return null;

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/15 flex items-center justify-center shrink-0" style={{ width: 64, height: 64 }}>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold truncate">{academy.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {academy.city && academy.country ? `${academy.city}، ${academy.country}` : academy.country || "—"}
                {" • "}{academy.currency}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-1 border-b border-border/60 overflow-x-auto">
          <button onClick={() => setTab("general")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "general" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <SettingsIcon className="inline h-4 w-4 ml-1" />عام
          </button>
          <button onClick={() => setTab("members")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "members" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <Users className="inline h-4 w-4 ml-1" />الأعضاء ({members.length})
          </button>
          <button onClick={() => setTab("advanced")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === "advanced" ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <AlertTriangle className="inline h-4 w-4 ml-1" />متقدم
          </button>
        </div>

        {tab === "general" && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4 rounded-2xl border bg-card p-6">
              <div className="space-y-2"><Label htmlFor="name">اسم الأكاديمية *</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={saving} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="country">الدولة</Label><Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={saving} /></div>
                <div className="space-y-2"><Label htmlFor="city">المدينة</Label><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} disabled={saving} /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">العملة</Label>
                <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={saving} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50">
                  <option value="USD">USD — دولار أمريكي</option>
                  <option value="IQD">IQD — دينار عراقي</option>
                  <option value="SAR">SAR — ريال سعودي</option>
                  <option value="AED">AED — درهم إماراتي</option>
                  <option value="EUR">EUR — يورو</option>
                  <option value="GBP">GBP — جنيه إسترليني</option>
                </select>
              </div>
            </div>
            {error && (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>)}
            {success && (<div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-500">تم حفظ التعديلات بنجاح</div>)}
            <div className="flex gap-3"><Button type="submit" disabled={saving}><Save className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</Button></div>
          </form>
        )}

        {tab === "members" && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card overflow-hidden divide-y">
              {members.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">لا يوجد أعضاء</p>
              ) : (
                members.map((m) => {
                  const RoleIcon = ROLE_ICONS[m.role] || UserIcon;
                  const isOwner = m.role === "owner";
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-4">
                      {m.profiles?.avatar_url ? (
                        <img src={m.profiles.avatar_url} alt="" style={{ width: 40, height: 40, objectFit: "cover" }} className="rounded-full border" />
                      ) : (
                        <div className="rounded-full bg-primary/15 flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}><RoleIcon className="h-4 w-4 text-primary" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.profiles?.full_name || "بدون اسم"}</p>
                        <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] || m.role}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] ${isOwner ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                        {ROLE_LABELS[m.role] || m.role}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center"><p className="text-xs text-muted-foreground">دعوة الأعضاء ستكون متاحة قريباً</p></div>
          </div>
        )}

        {tab === "advanced" && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">INFORMATION</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">معرّف الأكاديمية</span><span className="font-mono truncate ml-3 max-w-[60%]" dir="ltr">{academy.id}</span></div>
                <div className="flex justify-between py-2 border-b border-border/40"><span className="text-muted-foreground">عدد الأعضاء</span><span className="font-mono">{members.length}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
              <div className="flex items-start gap-3 mb-5">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-destructive">منطقة الخطر</h2>
                  <p className="mt-1 text-xs text-muted-foreground">هذه العمليات لا يمكن التراجع عنها.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">حذف الأكاديمية</p>
                    <p className="text-xs text-muted-foreground">حذف كل البيانات نهائياً (اللاعبين، الفرق، المباريات...)</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setDeleteAcademyOpen(true); setDeleteAcademyInput(""); setError(null); }} className="text-destructive border-destructive/40 hover:bg-destructive/10 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />حذف
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">حذف الحساب</p>
                    <p className="text-xs text-muted-foreground">حذف حسابك وكل الأكاديميات التي تملكها</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setDeleteAccountOpen(true); setDeleteAccountInput(""); setError(null); }} className="text-destructive border-destructive/40 hover:bg-destructive/10 shrink-0">
                    <LogOut className="h-3.5 w-3.5" />حذف
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteAcademyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !deletingAcademy && setDeleteAcademyOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-destructive/15 flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">حذف الأكاديمية نهائياً؟</h3>
                <p className="mt-1 text-xs text-muted-foreground">سيتم حذف كل البيانات (اللاعبين، الفرق، المباريات، الجلسات، الحضور). لا يمكن التراجع.</p>
              </div>
              <button onClick={() => !deletingAcademy && setDeleteAcademyOpen(false)} className="shrink-0 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 mb-4">
              <Label className="text-xs">اكتب اسم الأكاديمية للتأكيد: <span className="font-mono text-accent">{academy.name}</span></Label>
              <Input value={deleteAcademyInput} onChange={(e) => setDeleteAcademyInput(e.target.value)} disabled={deletingAcademy} placeholder={academy.name} />
            </div>
            {error && (<div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</div>)}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteAcademyOpen(false)} disabled={deletingAcademy}>إلغاء</Button>
              <Button onClick={handleDeleteAcademy} disabled={deletingAcademy || deleteAcademyInput.trim() !== academy.name} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deletingAcademy ? "جاري الحذف..." : "حذف نهائي"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !deletingAccount && setDeleteAccountOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-full bg-destructive/15 flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
                <LogOut className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">حذف حسابك نهائياً؟</h3>
                <p className="mt-1 text-xs text-muted-foreground">سيتم حذف حسابك وكل الأكاديميات التي تملكها. لا يمكن التراجع.</p>
              </div>
              <button onClick={() => !deletingAccount && setDeleteAccountOpen(false)} className="shrink-0 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2 mb-4">
              <Label className="text-xs">اكتب كلمة <span className="font-bold text-destructive">حذف</span> للتأكيد</Label>
              <Input value={deleteAccountInput} onChange={(e) => setDeleteAccountInput(e.target.value)} disabled={deletingAccount} placeholder="حذف" />
            </div>
            {error && (<div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 text-xs text-destructive">{error}</div>)}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteAccountOpen(false)} disabled={deletingAccount}>إلغاء</Button>
              <Button onClick={handleDeleteAccount} disabled={deletingAccount || deleteAccountInput.trim() !== "حذف"} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deletingAccount ? "جاري الحذف..." : "حذف الحساب"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
