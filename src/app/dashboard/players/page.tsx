"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  jersey_number: number | null;
  status: string;
};

export default function PlayersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [academyId, setAcademyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: members } = await supabase
        .from("academy_members")
        .select("academy_id")
        .eq("user_id", user.id)
        .limit(1);

      if (!members || members.length === 0) {
        router.push("/onboarding");
        return;
      }

      const aid = members[0].academy_id;
      setAcademyId(aid);

      const { data, error } = await supabase
        .from("players")
        .select("id, first_name, last_name, position, jersey_number, status")
        .eq("academy_id", aid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPlayers(data || []);
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

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">اللاعبين</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {players.length} لاعب
          </p>
        </div>
        <Link href="/dashboard/players/new">
          <Button>
            <Plus className="h-4 w-4" />
            إضافة لاعب
          </Button>
        </Link>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">لا يوجد لاعبين بعد</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            ابدأ بإضافة أول لاعب في أكاديميتك
          </p>
          <Link href="/dashboard/players/new">
            <Button>
              <Plus className="h-4 w-4" />
              إضافة لاعب
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr className="text-right text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">اللاعب</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">المركز</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">الرقم</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-t text-sm">
                  <td className="px-4 py-3 font-medium"><Link href={`/dashboard/players/${p.id}`} className="hover:text-primary transition-colors">
                    {p.first_name} {p.last_name}</Link>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {p.position || "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {p.jersey_number ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
