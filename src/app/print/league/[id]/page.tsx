"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { computeStandings, MatchForStandings } from "@/lib/standings";

type League = {
  id: string;
  academy_id: string;
  name: string;
  season: string | null;
  format: string;
  legs: number;
};

type Match = MatchForStandings & {
  id: string;
  round_number: number | null;
  match_date: string;
  match_time: string | null;
};

export default function LeaguePrintPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [league, setLeague] = useState<League | null>(null);
  const [academyName, setAcademyName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: lg, error } = await supabase
        .from("leagues")
        .select("id, academy_id, name, season, format, legs")
        .eq("id", leagueId)
        .maybeSingle();

      if (error || !lg) { setNotFound(true); setLoading(false); return; }
      setLeague(lg as League);

      const { data: acad } = await supabase
        .from("academies")
        .select("name")
        .eq("id", lg.academy_id)
        .maybeSingle();
      setAcademyName(acad?.name || "");

      const { data: mRows } = await supabase
        .from("matches")
        .select(`
          id, round_number, match_date, match_time, home_score, away_score,
          team_id, away_team_id, opponent,
          home_external_team_id, away_external_team_id,
          home_team:teams!matches_home_team_id_fkey(name),
          away_team:teams!matches_away_team_id_fkey(name),
          home_ext:external_teams!matches_home_external_team_id_fkey(name),
          away_ext:external_teams!matches_away_external_team_id_fkey(name)
        `)
        .eq("league_id", leagueId)
        .order("round_number", { ascending: true })
        .order("match_date", { ascending: true });

      setMatches((mRows as any) || []);
      setLoading(false);
    }
    load();
  }, [leagueId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-black">
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (notFound || !league) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-black">
        <p>الدوري غير موجود</p>
      </div>
    );
  }

  const standings = computeStandings(matches);
  const matchesByRound = matches.reduce<Record<number, Match[]>>((acc, m) => {
    const r = m.round_number || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(m);
    return acc;
  }, {});
  const roundKeys = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      {/* Print Button - hidden on print */}
      <div className="print:hidden sticky top-0 z-10 flex justify-center gap-2 border-b bg-gray-50 p-3">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Printer className="h-4 w-4" /> طباعة / حفظ PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100"
        >
          إغلاق
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] p-8 print:p-6">
        {/* Header */}
        <div className="mb-6 border-b-2 border-black pb-4 text-center">
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {academyName}
            {league.season && ` — موسم ${league.season}`}
          </p>
        </div>

        {/* Standings Table */}
        <section className="mb-8">
          <h2 className="mb-3 border-r-4 border-black pr-3 text-lg font-bold">
            جدول الترتيب
          </h2>
          {standings.length === 0 ? (
            <p className="text-sm text-gray-500">لا يوجد بيانات ترتيب بعد.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-2 text-center">#</th>
                  <th className="border border-gray-400 p-2 text-right">الفريق</th>
                  <th className="border border-gray-400 p-2 text-center">لعب</th>
                  <th className="border border-gray-400 p-2 text-center">ف</th>
                  <th className="border border-gray-400 p-2 text-center">ت</th>
                  <th className="border border-gray-400 p-2 text-center">خ</th>
                  <th className="border border-gray-400 p-2 text-center">له</th>
                  <th className="border border-gray-400 p-2 text-center">عليه</th>
                  <th className="border border-gray-400 p-2 text-center">+/-</th>
                  <th className="border border-gray-400 p-2 text-center">نقاط</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((r, i) => (
                  <tr key={r.key}>
                    <td className="border border-gray-400 p-2 text-center">{i + 1}</td>
                    <td className="border border-gray-400 p-2 font-medium">{r.name}</td>
                    <td className="border border-gray-400 p-2 text-center">{r.played}</td>
                    <td className="border border-gray-400 p-2 text-center">{r.won}</td>
                    <td className="border border-gray-400 p-2 text-center">{r.drawn}</td>
                    <td className="border border-gray-400 p-2 text-center">{r.lost}</td>
                    <td className="border border-gray-400 p-2 text-center">{r.goalsFor}</td>
                    <td className="border border-gray-400 p-2 text-center">{r.goalsAgainst}</td>
                    <td className="border border-gray-400 p-2 text-center">
                      {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                    </td>
                    <td className="border border-gray-400 p-2 text-center font-bold">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Matches by Round */}
        <section>
          <h2 className="mb-3 border-r-4 border-black pr-3 text-lg font-bold">
            جدول المباريات
          </h2>
          {roundKeys.length === 0 ? (
            <p className="text-sm text-gray-500">لا يوجد مباريات بعد.</p>
          ) : (
            <div className="space-y-4">
              {roundKeys.map((r) => (
                <div key={r} className="break-inside-avoid">
                  <h3 className="mb-2 text-sm font-bold text-gray-700">الجولة {r}</h3>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-400 p-1.5 text-right">المضيف</th>
                        <th className="border border-gray-400 p-1.5 text-center w-20">النتيجة</th>
                        <th className="border border-gray-400 p-1.5 text-left">الضيف</th>
                        <th className="border border-gray-400 p-1.5 text-center w-24">التاريخ</th>
                        <th className="border border-gray-400 p-1.5 text-center w-16">الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchesByRound[r].map((m) => {
                        const homeName = m.home_team?.name || m.home_ext?.name || "—";
                        const awayName = m.away_team?.name || m.away_ext?.name || m.opponent || "—";
                        const hasScore = m.home_score !== null && m.away_score !== null;
                        return (
                          <tr key={m.id}>
                            <td className="border border-gray-400 p-1.5 text-right">{homeName}</td>
                            <td className="border border-gray-400 p-1.5 text-center font-mono">
                              {hasScore ? `${m.home_score} - ${m.away_score}` : "—"}
                            </td>
                            <td className="border border-gray-400 p-1.5 text-left">{awayName}</td>
                            <td className="border border-gray-400 p-1.5 text-center">{m.match_date}</td>
                            <td className="border border-gray-400 p-1.5 text-center">
                              {m.match_time ? m.match_time.slice(0, 5) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="mt-8 border-t border-gray-300 pt-3 text-center text-[10px] text-gray-500">
          تم إنشاء هذا التقرير بواسطة ApexAcademy Cloud — {new Date().toLocaleDateString("ar-IQ")}
        </div>
      </div>
    </div>
  );
}
