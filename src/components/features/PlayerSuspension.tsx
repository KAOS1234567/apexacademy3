"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Suspension = {
  id: string;
  reason: string;
  matches_remaining: number;
  note: string | null;
  created_at: string;
};

const REASON_LABELS: Record<string, string> = {
  red_card: "بطاقة حمراء",
  yellow_accumulation: "تراكم بطاقات صفراء",
  other: "أخرى",
};

export function PlayerSuspension({ playerId }: { playerId: string }) {
  const [loading, setLoading] = useState(true);
  const [suspensions, setSuspensions] = useState<Suspension[]>([]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("player_suspensions")
      .select("id, reason, matches_remaining, note, created_at")
      .eq("player_id", playerId)
      .gt("matches_remaining", 0)
      .order("created_at", { ascending: false });
    setSuspensions((data as Suspension[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    if (playerId) load();
  }, [playerId]);

  async function handleClear(id: string) {
    if (!confirm("إلغاء الإيقاف؟ اللاعب راح يقدر يلعب المباراة القادمة.")) return;
    const supabase = createClient();
    await supabase.from("player_suspensions").delete().eq("id", id);
    await load();
  }

  if (loading) {
    return <div className="rounded-2xl border bg-card p-4 text-center text-sm text-muted-foreground">···</div>;
  }

  if (suspensions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">لا يوجد إيقافات نشطة — اللاعب جاهز للمشاركة</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suspensions.map((s) => (
        <div key={s.id} className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-destructive/15 flex items-center justify-center shrink-0" style={{ width: 36, height: 36 }}>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-destructive">موقوف</span>
                <span className="text-xs text-muted-foreground">
                  {REASON_LABELS[s.reason] || s.reason}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                متبقٍ: <span className="font-mono font-bold text-foreground">{s.matches_remaining}</span> مباراة
              </p>
            </div>
            <button
              onClick={() => handleClear(s.id)}
              className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="إلغاء الإيقاف"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
