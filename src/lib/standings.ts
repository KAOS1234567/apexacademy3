export type StandingsRow = {
  key: string;
  name: string;
  isExternal: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export type MatchForStandings = {
  home_score: number | null;
  away_score: number | null;
  team_id: string | null;
  away_team_id: string | null;
  home_external_team_id: string | null;
  away_external_team_id: string | null;
  home_team?: { name: string } | null;
  away_team?: { name: string } | null;
  home_ext?: { name: string } | null;
  away_ext?: { name: string } | null;
};

export function computeStandings(matches: MatchForStandings[]): StandingsRow[] {
  const map = new Map<string, StandingsRow>();

  function getRef(m: MatchForStandings, side: "home" | "away") {
    if (side === "home") {
      if (m.team_id) return { key: "int:" + m.team_id, name: m.home_team?.name || "—", isExternal: false };
      if (m.home_external_team_id) return { key: "ext:" + m.home_external_team_id, name: m.home_ext?.name || "—", isExternal: true };
    } else {
      if (m.away_team_id) return { key: "int:" + m.away_team_id, name: m.away_team?.name || "—", isExternal: false };
      if (m.away_external_team_id) return { key: "ext:" + m.away_external_team_id, name: m.away_ext?.name || "—", isExternal: true };
    }
    return null;
  }

  function ensure(key: string, name: string, isExternal: boolean): StandingsRow {
    let row = map.get(key);
    if (!row) {
      row = { key, name, isExternal, played: 0, won: 0, drawn: 0, lost: 0,
              goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
      map.set(key, row);
    }
    return row;
  }

  for (const m of matches) {
    if (m.home_score === null || m.away_score === null) continue;
    const home = getRef(m, "home");
    const away = getRef(m, "away");
    if (!home || !away) continue;

    const h = ensure(home.key, home.name, home.isExternal);
    const a = ensure(away.key, away.name, away.isExternal);

    h.played++; a.played++;
    h.goalsFor += m.home_score; h.goalsAgainst += m.away_score;
    a.goalsFor += m.away_score; a.goalsAgainst += m.home_score;

    if (m.home_score > m.away_score) { h.won++; h.points += 3; a.lost++; }
    else if (m.home_score < m.away_score) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.points += 1; a.points += 1; }
  }

  const rows = Array.from(map.values());
  for (const r of rows) r.goalDiff = r.goalsFor - r.goalsAgainst;
  rows.sort((a, b) =>
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.name.localeCompare(b.name)
  );
  return rows;
}
