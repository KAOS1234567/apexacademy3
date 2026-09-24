"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";

type League = {
  id: string;
  name: string;
  season: string | null;
  format: string;
  legs: number;
  status: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  finished: "منتهي",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  finished: "bg-muted/40 text-muted-foreground",
};

const FORMAT_LABELS: Record<string, string> = {
  league: "دوري",
  groups: "مجموعات",
};

export default function LeaguesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
        .from("leagues")
        .select("id, name, season, format, legs, status")
        .eq("academy_id", members[0].academy_id)
        .order("created_at", { ascending: false });

      setLeagues(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  const filtered = leagues.filter((l) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!l.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الدوريات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} من {leagues.length} دوري
          </p>
        </div>
        <Link href="/dashboard/leagues/new">
          <Button>
            <Plus className="h-4 w-4" /> إضافة دوري
          </Button>
        </Link>
      </div>

      {leagues.length > 0 && (
        <div className="mb-6">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ابحث عن دوري..."
          />
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Medal className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">لا يوجد دوريات بعد</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            ابدأ بإنشاء دوري لتنظيم مباريات فرقك
          </p>
          <Link href="/dashboard/leagues/new">
            <Button>
              <Plus className="h-4 w-4" /> إضافة دوري
            </Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <p className="text-sm text-muted-foreground">لا يوجد نتائج مطابقة</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/leagues/${l.id}`}
              className="rounded-2xl border bg-card p-5 transition hover:border-primary/50"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                  <Medal className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{l.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {FORMAT_LABELS[l.format] || l.format}
                    {l.season && ` • ${l.season}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {l.legs === 2 ? "ذهاب وإياب" : "ذهاب فقط"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[l.status] || "bg-muted"}`}
                >
                  {STATUS_LABELS[l.status] || l.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
