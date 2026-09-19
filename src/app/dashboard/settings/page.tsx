"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Academy = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  currency: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [academyId, setAcademyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members")
        .select("academy_id, academies(id, name, country, city, currency)")
        .eq("user_id", user.id)
        .limit(1);

      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const ac = (members[0] as unknown as { academies: Academy }).academies;
      setAcademyId(ac.id);
      setName(ac.name);
      setCountry(ac.country || "");
      setCity(ac.city || "");
      setCurrency(ac.currency || "USD");
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!academyId) return;
    setError(null);
    setSuccess(false);
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("academies")
      .update({
        name: name.trim(),
        country: country.trim() || null,
        city: city.trim() || null,
        currency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", academyId);

    if (error) { setError(error.message); setSaving(false); return; }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    router.refresh();
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center p-10"><p className="text-sm text-muted-foreground">···</p></div>;
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">إعدادات الأكاديمية</h1>
          <p className="mt-1 text-sm text-muted-foreground">عدّل بيانات أكاديميتك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الأكاديمية *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={saving} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">الدولة</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={saving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={saving}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="USD">USD — دولار أمريكي</option>
                <option value="IQD">IQD — دينار عراقي</option>
                <option value="SAR">SAR — ريال سعودي</option>
                <option value="AED">AED — درهم إماراتي</option>
                <option value="EUR">EUR — يورو</option>
                <option value="GBP">GBP — جنيه إسترليني</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-500">
              تم حفظ التعديلات بنجاح
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
