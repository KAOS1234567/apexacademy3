"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewLeaguePage() {
  const router = useRouter();
  const [academyId, setAcademyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [format, setFormat] = useState<"league" | "groups">("league");
  const [legs, setLegs] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!academyId) return;
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("leagues")
      .insert({
        academy_id: academyId,
        name: name.trim(),
        season: season.trim() || null,
        format,
        legs,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/leagues/${data.id}`);
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إنشاء دوري جديد</h1>
            <p className="text-sm text-muted-foreground">
              حدد التفاصيل الأساسية للدوري
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الدوري *</Label>
              <Input
                id="name"
                placeholder="مثال: دوري الناشئين 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="season">الموسم</Label>
              <Input
                id="season"
                placeholder="مثال: 2026/2027"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="format">النظام</Label>
                <select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value as "league" | "groups")}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="league">دوري عادي</option>
                  <option value="groups">مجموعات</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legs">الصيغة</Label>
                <select
                  id="legs"
                  value={legs}
                  onChange={(e) => setLegs(Number(e.target.value) as 1 | 2)}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value={1}>ذهاب فقط</option>
                  <option value={2}>ذهاب وإياب</option>
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
            <Button type="submit" disabled={loading || !academyId}>
              {loading ? "جاري الإنشاء..." : "إنشاء الدوري"}
            </Button>
            <Link href="/dashboard/leagues">
              <Button type="button" variant="outline" disabled={loading}>
                إلغاء
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
