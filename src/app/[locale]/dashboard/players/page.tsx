"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
  status: string;
  team_id: string | null;
  photo_url: string | null;
};

type Team = { id: string; name: string; logo_url: string | null };

export default function PlayersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, Team>>({});
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

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
      const aid = members[0].academy_id;

      const { data: playersData, error: pErr } = await supabase
        .from("players")
        .select("id, first_name, last_name, position, jersey_number, status, team_id, photo_url")
        .eq("academy_id", aid)
        .order("created_at", { ascending: false });

      if (pErr) { setError(pErr.message); setLoading(false); return; }

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, logo_url")
        .eq("academy_id", aid);

      const map: Record<string, Team> = {};
      (teamsData as Team[] || []).forEach((t) => { map[t.id] = t; });

      setPlayers((playersData as Player[]) || []);
      setTeamsMap(map);
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

  if (error) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">خطأ: {error}</div>
      </div>
    );
  }

  const filtered = players.filter((p) => {
    if (teamFilter === "none" && p.team_id) return false;
    if (teamFilter && teamFilter !== "none" && p.team_id !== teamFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      if (!fullName.includes(q)) return false;
    }
    return true;
  });

  const teams = Object.values(teamsMap);
  const hasFilters = searchQuery || teamFilter || statusFilter;

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">اللاعبين</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} من {players.length} لاعب</p>
        </div>
        <Link href="/dashboard/players/new">
          <Button><Plus className="h-4 w-4" />إضافة لاعب</Button>
        </Link>
      </div>

      {players.length > 0 && (
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_200px_200px]">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="ابحث بالاسم..." />
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">كل الفرق</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            <option value="none">بدون فريق</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
            <option value="trial">تجريبي</option>
          </select>
        </div>
      )}

      {hasFilters && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            النتائج: {filtered.length} لاعب
          </p>
          <button
            onClick={() => { setSearchQuery(""); setTeamFilter(""); setStatusFilter(""); }}
            className="text-xs text-accent hover:underline"
          >
            مسح الفلاتر
          </button>
        </div>
      )}

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">لا يوجد لاعبين بعد</h3>
          <p className="mb-6 text-sm text-muted-foreground">ابدأ بإضافة أول لاعب في أكاديميتك</p>
          <Link href="/dashboard/players/new"><Button><Plus className="h-4 w-4" />إضافة لاعب</Button></Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <p className="text-sm text-muted-foreground">— لا يوجد لاعبون مطابقون للفلترة —</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr className="text-right text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">اللاعب</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">الفريق</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">المركز</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">الرقم</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const team = p.team_id ? teamsMap[p.team_id] : null;
                return (
                  <tr key={p.id} className="border-t text-sm">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/dashboard/players/${p.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} className="h-9 w-9 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {p.first_name.charAt(0)}
                          </div>
                        )}
                        <span>{p.first_name} {p.last_name}</span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {team ? (
                        <div className="flex items-center gap-2">
                          {team.logo_url ? (
                            <img src={team.logo_url} alt={team.name} className="h-5 w-5 rounded object-cover" />
                          ) : (
                            <div className="h-5 w-5 rounded bg-muted" />
                          )}
                          <span className="text-xs">{team.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{p.position || "—"}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{p.jersey_number ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">{p.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
