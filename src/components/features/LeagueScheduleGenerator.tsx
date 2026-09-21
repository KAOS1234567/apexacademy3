"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateRoundRobin, TeamRef } from "@/lib/roundRobin";

type LeagueTeam = {
  id: string;
  team_id: string | null;
  external_team_id: string | null;
  group_name: string | null;
  teams: { id: string; name: string } | null;
  external_teams: { id: string; name: string } | null;
};

type Props = {
  leagueId: string;
  academyId: string;
  leagueTeams: LeagueTeam[];
  legs: 1 | 2;
  format: string;
  existingMatchesCount: number;
  onGenerated: () => void;
};

export function LeagueScheduleGenerator({
  leagueId, academyId, leagueTeams, legs, format,
  existingMatchesCount, onGenerated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [intervalDays, setIntervalDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (leagueTeams.length < 2) { setError("تحتاج فريقين على الأقل"); return; }
    if (existingMatchesCount > 0) {
      const ok = window.confirm("سيتم حذف المباريات الحالية لهذا الدوري. متابعة؟");
      if (!ok) return;
    }

    setBusy(true);
    setError("");
    const supabase = createClient();

    if (existingMatchesCount > 0) {
      await supabase.from("matches").delete().eq("league_id", leagueId);
    }

    const groups = new Map<string | null, LeagueTeam[]>();
    if (format === "groups") {
      for (const lt of leagueTeams) {
        const key = lt.group_name || "A";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(lt);
      }
    } else {
      groups.set(null, leagueTeams);
    }

    const start = new Date(startDate);
    const allRows: any[] = [];
    let globalRound = 0;

    for (const [, teams] of groups) {
      const teamRefs: TeamRef[] = teams.map((lt) => {
        if (lt.external_team_id && lt.external_teams) {
          return { kind: "external" as const, id: lt.external_team_id, name: lt.external_teams.name };
        }
        return { kind: "internal" as const, id: lt.team_id!, name: lt.teams?.name || "—" };
      });

      const rounds = generateRoundRobin(teamRefs, legs);

      for (const round of rounds) {
        globalRound++;
        const roundDate = new Date(start);
        roundDate.setDate(roundDate.getDate() + (globalRound - 1) * intervalDays);
        const dateStr = roundDate.toISOString().split("T")[0];

        for (const [home, away] of round) {
          allRows.push({
            academy_id: academyId,
            league_id: leagueId,
            round_number: globalRound,
            match_date: dateStr,
            opponent: away.name,
            team_id: home.kind === "internal" ? home.id : null,
            opponent_team_id: away.kind === "internal" ? away.id : null,
            home_team_id: home.kind === "internal" ? home.id : null,
            away_team_id: away.kind === "internal" ? away.id : null,
            home_external_team_id: home.kind === "external" ? home.id : null,
            away_external_team_id: away.kind === "external" ? away.id : null,
          });
        }
      }
    }

    if (allRows.length === 0) {
      setError("لا يوجد فرق كافية");
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase.from("matches").insert(allRows);

    if (insertError) {
      setError(insertError.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    setOpen(false);
    onGenerated();
  }

  return (
    <div>
      {!open ? (
        <Button size="sm" onClick={() => setOpen(true)} disabled={leagueTeams.length < 2}>
          <CalendarPlus className="h-4 w-4" /> توليد الجدول
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="startDate">تاريخ أول جولة</Label>
              <Input
                id="startDate" type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} disabled={busy}
              />
            </div>
            <div>
              <Label htmlFor="interval">أيام بين الجولات</Label>
              <Input
                id="interval" type="number" min={1} max={30} value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value) || 7)} disabled={busy}
              />
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleGenerate} disabled={busy}>
              {busy ? "جاري التوليد..." : "توليد"}
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => { setOpen(false); setError(""); }} disabled={busy}>
              إلغاء
            </Button>
          </div>
          {existingMatchesCount > 0 && (
            <p className="text-xs text-amber-500">
              ⚠️ يوجد {existingMatchesCount} مباراة حالية — سيتم استبدالها
            </p>
          )}
        </div>
      )}
    </div>
  );
}
