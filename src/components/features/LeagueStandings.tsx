"use client";

import { Globe, Shield } from "lucide-react";
import { computeStandings, MatchForStandings } from "@/lib/standings";
import { useDict } from "@/i18n/DictProvider";

type Props = {
  matches: MatchForStandings[];
};

export function LeagueStandings({ matches }: Props) {
  const { tr } = useDict();
  const rows = computeStandings(matches);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          لا يوجد بيانات — الترتيب يظهر بعد تسجيل نتائج المباريات
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="border-b text-[10px] md:text-xs text-muted-foreground">
            <th className="py-2 px-1 text-center font-medium w-6">#</th>
            <th className="py-2 px-2 text-right font-medium">{tr("الفريق")}</th>
            <th className="py-2 px-1 text-center font-medium">لعب</th>
            <th className="py-2 px-1 text-center font-medium hidden md:table-cell">{tr("ف")}</th>
            <th className="py-2 px-1 text-center font-medium hidden md:table-cell">{tr("ت")}</th>
            <th className="py-2 px-1 text-center font-medium hidden md:table-cell">{tr("خ")}</th>
            <th className="py-2 px-1 text-center font-medium hidden md:table-cell">{tr("له")}</th>
            <th className="py-2 px-1 text-center font-medium hidden md:table-cell">{tr("عليه")}</th>
            <th className="py-2 px-1 text-center font-medium">+/-</th>
            <th className="py-2 px-1 text-center font-medium">نقاط</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className="border-b last:border-0">
              <td className="py-2 px-1 text-center text-[10px] md:text-xs text-muted-foreground">
                {i + 1}
              </td>
              <td className="py-2 px-2">
                <div className="flex items-center gap-1.5">
                  {r.isExternal
                    ? <Globe className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    : <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <span className="font-medium truncate max-w-[90px] md:max-w-none">{r.name}</span>
                </div>
              </td>
              <td className="py-2 px-1 text-center tabular-nums">{r.played}</td>
              <td className="py-2 px-1 text-center tabular-nums text-primary hidden md:table-cell">{r.won}</td>
              <td className="py-2 px-1 text-center tabular-nums text-muted-foreground hidden md:table-cell">{r.drawn}</td>
              <td className="py-2 px-1 text-center tabular-nums text-destructive hidden md:table-cell">{r.lost}</td>
              <td className="py-2 px-1 text-center tabular-nums hidden md:table-cell">{r.goalsFor}</td>
              <td className="py-2 px-1 text-center tabular-nums hidden md:table-cell">{r.goalsAgainst}</td>
              <td className="py-2 px-1 text-center tabular-nums">
                {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
              </td>
              <td className="py-2 px-1 text-center font-bold tabular-nums">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
