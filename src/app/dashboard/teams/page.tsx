"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { useDict } from "@/i18n/DictProvider";
import { teamsDict } from "@/i18n/teams";

type Team = { id: string; name: string; category: string | null; season: string | null; logo_url: string | null };

export default function TeamsPage() {
  const router = useRouter();
  const { locale } = useDict();
  const t = teamsDict[locale as keyof typeof teamsDict] || teamsDict.ar;

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: members } = await supabase.from("academy_members").select("academy_id").eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }
      const { data } = await supabase.from("teams").select("id, name, category, season, logo_url").eq("academy_id", members[0].academy_id).order("created_at", { ascending: false });
      setTeams(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="flex h-full items-center justify-center p-10"><p className="text-muted-foreground">···</p></div>;

  const filtered = teams.filter((tm) => {
    if (categoryFilter && tm.category !== categoryFilter) return false;
    if (searchQuery.trim() && !tm.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    return true;
  });

  const catLabel = (cat: string | null) => {
    if (!cat) return t.noCategory;
    const map: Record<string, string> = { U8: t.catU8, U10: t.catU10, U12: t.catU12, U14: t.catU14, U16: t.catU16, U18: t.catU18, U20: t.catU20, Senior: t.catSenior };
    return map[cat] || cat;
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} {t.showingOf} {teams.length} {t.teamsWord}</p>
        </div>
        <Link href="/dashboard/teams/new"><Button><Plus className="h-4 w-4" />{t.addTeam}</Button></Link>
      </div>

      {teams.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_200px]">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t.searchPlaceholder} />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">{t.allCategories}</option>
            <option value="U8">{t.catU8}</option>
            <option value="U10">{t.catU10}</option>
            <option value="U12">{t.catU12}</option>
            <option value="U14">{t.catU14}</option>
            <option value="U16">{t.catU16}</option>
            <option value="U18">{t.catU18}</option>
            <option value="U20">{t.catU20}</option>
            <option value="Senior">{t.catSenior}</option>
          </select>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Shield className="h-6 w-6 text-muted-foreground" /></div>
          <h3 className="mb-2 text-lg font-semibold">{t.noTeams}</h3>
          <p className="mb-6 text-sm text-muted-foreground">{t.noTeamsDesc}</p>
          <Link href="/dashboard/teams/new"><Button><Plus className="h-4 w-4" />{t.addTeam}</Button></Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center"><p className="text-sm text-muted-foreground">— {t.emptyFilter} —</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tm) => (
            <Link key={tm.id} href={`/dashboard/teams/${tm.id}`} className="rounded-2xl border bg-card p-5 transition hover:border-primary/50">
              <div className="mb-3">
                {tm.logo_url ? (<img src={tm.logo_url} alt={tm.name} className="h-14 w-14 rounded-xl object-cover border border-border" />) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15"><Shield className="h-7 w-7 text-primary" /></div>
                )}
              </div>
              <h3 className="font-semibold">{tm.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{catLabel(tm.category)} • {tm.season || t.noSeason}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
