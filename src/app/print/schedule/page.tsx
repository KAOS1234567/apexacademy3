"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Session = {
  id: string;
  title: string | null;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  session_type: string | null;
  teams: { name: string } | null;
};

type MatchLite = {
  id: string;
  match_date: string;
  match_time: string | null;
  opponent: string | null;
  home_score: number | null;
  away_score: number | null;
  league_id: string | null;
  teams: { name: string } | null;
};

const AR_DAYS = ["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];
const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

const TYPE_LABELS: Record<string, string> = {
  training: "تدريب",
  match: "مباراة",
  cup: "كأس",
  rest: "راحة",
  meeting: "اجتماع",
};

function pad(n: number) { return n.toString().padStart(2, "0"); }
function weekdayIdx(jsDay: number): number { return jsDay === 6 ? 0 : jsDay + 1; }

function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "م" : "ص";
  if (h === 0) h = 12;
  else if (h > 12) h = h - 12;
  return `${h}:${mStr} ${suffix}`;
}

export default function SchedulePrintPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [academyName, setAcademyName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [matches, setMatches] = useState<MatchLite[]>([]);
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: members } = await supabase
        .from("academy_members").select("academy_id")
        .eq("user_id", user.id).limit(1);
      if (!members || members.length === 0) { router.push("/onboarding"); return; }

      const { data: acad } = await supabase
        .from("academies").select("name")
        .eq("id", members[0].academy_id).maybeSingle();
      setAcademyName(acad?.name || "");

      const { data: ss } = await supabase
        .from("training_sessions")
        .select("id, title, session_date, start_time, end_time, location, session_type, teams(name)")
        .eq("academy_id", members[0].academy_id)
        .order("session_date");

      const { data: ms } = await supabase
        .from("matches")
        .select("id, match_date, match_time, opponent, home_score, away_score, league_id, teams(name)")
        .eq("academy_id", members[0].academy_id)
        .order("match_date");

      setSessions((ss as any) || []);
      setMatches((ms as any) || []);

      const dates = [...(ss || []).map((s: any) => s.session_date), ...(ms || []).map((m: any) => m.match_date)].sort();
      if (dates.length > 0) {
        const [y, mo] = dates[0].split("-").map(Number);
        setCursor(new Date(y, mo - 1, 1));
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-white text-black">جاري التحميل...</div>;
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = weekdayIdx(firstOfMonth.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function dateKey(d: number) { return `${year}-${pad(month+1)}-${pad(d)}`; }

  return (
    <div className="min-h-screen bg-white text-black" dir="rtl">
      <div className="print:hidden sticky top-0 z-10 flex justify-center gap-2 border-b bg-gray-50 p-3">
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Printer className="h-4 w-4" /> طباعة / حفظ PDF
        </button>
        <button onClick={() => window.close()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-100">
          إغلاق
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] p-6 print:p-4">
        <div className="mb-4 border-b-2 border-black pb-3 text-center">
          <h1 className="text-2xl font-bold">الجدول الشهري</h1>
          <p className="mt-1 text-sm text-gray-600">
            {academyName} — {AR_MONTHS[month]} {year}
          </p>
        </div>

        {/* Calendar grid */}
        <div className="mb-6">
          <div className="grid grid-cols-7 border-t border-r border-black">
            {AR_DAYS.map(d => (
              <div key={d} className="border-b border-l border-black bg-gray-100 py-1.5 text-center text-xs font-bold">
                {d}
              </div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="min-h-[70px] border-b border-l border-black" />;
              const key = dateKey(d);
              const daySessions = sessions.filter(s => s.session_date === key);
              const dayMatches = matches.filter(m => m.match_date === key);
              return (
                <div key={i} className="min-h-[70px] border-b border-l border-black p-1 text-[10px] leading-tight">
                  <div className="mb-0.5 font-bold">{d}</div>
                  {daySessions.map(s => (
                    <div key={s.id} className="truncate">
                      <span className="font-semibold">{s.teams?.name || TYPE_LABELS[s.session_type || "training"] || "—"}</span>
                      {s.start_time && <span className="text-gray-600"> {formatTime(s.start_time)}</span>}
                    </div>
                  ))}
                  {dayMatches.map(m => (
                    <div key={m.id} className="truncate">
                      <span className="font-semibold">{m.teams?.name || "—"}</span>
                      <span className="text-gray-600"> × {m.opponent || "—"}</span>
                      {m.match_time && <span className="text-gray-600"> {formatTime(m.match_time)}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* List of items this month */}
        <section className="mb-4">
          <h2 className="mb-2 border-r-4 border-black pr-2 text-sm font-bold">جلسات الشهر</h2>
          {sessions.filter(s => s.session_date.startsWith(`${year}-${pad(month+1)}`)).length === 0 ? (
            <p className="text-xs text-gray-500">لا يوجد جلسات هذا الشهر.</p>
          ) : (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1 text-right">التاريخ</th>
                  <th className="border border-gray-400 p-1 text-right">النوع</th>
                  <th className="border border-gray-400 p-1 text-right">الفريق</th>
                  <th className="border border-gray-400 p-1 text-right">العنوان</th>
                  <th className="border border-gray-400 p-1 text-center">الوقت</th>
                  <th className="border border-gray-400 p-1 text-right">المكان</th>
                </tr>
              </thead>
              <tbody>
                {sessions.filter(s => s.session_date.startsWith(`${year}-${pad(month+1)}`)).map(s => (
                  <tr key={s.id}>
                    <td className="border border-gray-400 p-1">{s.session_date}</td>
                    <td className="border border-gray-400 p-1">{TYPE_LABELS[s.session_type || "training"]}</td>
                    <td className="border border-gray-400 p-1">{s.teams?.name || "—"}</td>
                    <td className="border border-gray-400 p-1">{s.title || "—"}</td>
                    <td className="border border-gray-400 p-1 text-center">{formatTime(s.start_time) || "—"}</td>
                    <td className="border border-gray-400 p-1">{s.location || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="mb-2 border-r-4 border-black pr-2 text-sm font-bold">مباريات الشهر</h2>
          {matches.filter(m => m.match_date.startsWith(`${year}-${pad(month+1)}`)).length === 0 ? (
            <p className="text-xs text-gray-500">لا يوجد مباريات هذا الشهر.</p>
          ) : (
            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1 text-right">التاريخ</th>
                  <th className="border border-gray-400 p-1 text-right">الفريق</th>
                  <th className="border border-gray-400 p-1 text-center">ضد</th>
                  <th className="border border-gray-400 p-1 text-center">النتيجة</th>
                  <th className="border border-gray-400 p-1 text-center">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {matches.filter(m => m.match_date.startsWith(`${year}-${pad(month+1)}`)).map(m => {
                  const hasScore = m.home_score !== null && m.away_score !== null;
                  return (
                    <tr key={m.id}>
                      <td className="border border-gray-400 p-1">{m.match_date}</td>
                      <td className="border border-gray-400 p-1">{m.teams?.name || "—"}</td>
                      <td className="border border-gray-400 p-1 text-center">{m.opponent || "—"}</td>
                      <td className="border border-gray-400 p-1 text-center font-bold">
                        {hasScore ? `${m.home_score} - ${m.away_score}` : "—"}
                      </td>
                      <td className="border border-gray-400 p-1 text-center">{formatTime(m.match_time) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <div className="mt-6 border-t border-gray-300 pt-2 text-center text-[9px] text-gray-500">
          تم إنشاء هذا التقرير بواسطة ApexAcademy Cloud — {new Date().toLocaleDateString("ar-IQ")}
        </div>
      </div>
    </div>
  );
}
