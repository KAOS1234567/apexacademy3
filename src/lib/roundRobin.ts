export type TeamRef =
  | { kind: "internal"; id: string; name: string }
  | { kind: "external"; id: string; name: string };

export type Matchup = [TeamRef, TeamRef]; // [home, away]
export type Round = Matchup[];

/**
 * خوارزمية الدوري الدائري (Circle Method / Berger Tables)
 * تعطي كل فريق مباراة ضد كل فريق آخر مرة واحدة (legs=1)
 * أو مرتين ذهابًا وإيابًا (legs=2)
 */
export function generateRoundRobin(teams: TeamRef[], legs: 1 | 2): Round[] {
  if (teams.length < 2) return [];

  const list: (TeamRef | null)[] = [...teams];
  if (list.length % 2 === 1) list.push(null); // bye

  const n = list.length;
  const roundsPerLeg = n - 1;
  const rounds: Round[] = [];

  const arr = [...list];

  for (let r = 0; r < roundsPerLeg; r++) {
    const round: Matchup = [];

    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];

      if (!a || !b) continue; // تخطّى bye

      // تبادل الضيافة لتحقيق التوازن
      const swap = (i === 0 && r % 2 === 1) || (i > 0 && i % 2 === 1);
      const home = swap ? b : a;
      const away = swap ? a : b;

      round.push([home, away]);
    }

    rounds.push(round);

    // تدوير: إبقاء arr[0] ثابتًا، تدوير arr[1..] يمينًا
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  }

  if (legs === 2) {
    const secondLeg: Round[] = rounds.map((round) =>
      round.map(([h, a]) => [a, h] as Matchup)
    );
    return [...rounds, ...secondLeg];
  }

  return rounds;
}

/**
 * تقسيم الفرق إلى مجموعات حسب group_name
 * (إن لم تكن هناك مجموعات، يرجع مجموعة واحدة بـnull)
 */
export function groupTeams<T extends { group_name: string | null }>(
  leagueTeams: T[]
): Map<string | null, T[]> {
  const map = new Map<string | null, T[]>();
  for (const lt of leagueTeams) {
    const key = lt.group_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(lt);
  }
  return map;
}
