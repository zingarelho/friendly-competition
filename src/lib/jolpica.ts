const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";

export interface JolpicaCalendarResponse {
  MRData: {
    RaceTable: {
      season: string;
      Races: Array<{
        season: string;
        round: string;
        raceName: string;
        date: string;
        Circuit?: { circuitName: string };
      }>;
    };
  };
}

export interface JolpicaResultsResponse {
  MRData: {
    RaceTable: {
      season: string;
      round: string;
      Races: Array<{
        Results?: Array<{
          Driver: { code: string; driverId: string };
          points: string;
          position: string;
        }>;
      }>;
    };
  };
}

const FALLBACK_RESULTS = [
  { id: "VER", points: 25 },
  { id: "NOR", points: 18 },
  { id: "LEC", points: 15 },
  { id: "HAM", points: 12 },
  { id: "PIA", points: 10 },
];

export async function fetchCalendar(season: string = "2026") {
  const resp = await fetch(`${JOLPICA_BASE}/${season}.json`, {
    headers: { "User-Agent": "FriendlyCompetition/1.0" },
  });
  if (!resp.ok) return null;
  const data: JolpicaCalendarResponse = await resp.json();
  return data.MRData.RaceTable.Races.map((r) => ({
    round: parseInt(r.round),
    name: r.raceName,
    date: r.date,
  }));
}

export async function fetchResults(round: number, season: string = "2026") {
  try {
    const resp = await fetch(`${JOLPICA_BASE}/${season}/${round}/results.json`, {
      headers: { "User-Agent": "FriendlyCompetition/1.0" },
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    if (!text.trim()) return [];
    const data: JolpicaResultsResponse = JSON.parse(text);
    const races = data.MRData.RaceTable.Races;
    if (!races || races.length === 0) return [];
    const results = races[0].Results;
    if (!results || results.length === 0) return [];
    return results.slice(0, 5).map((r) => ({
      id: r.Driver.code,
      points: parseInt(r.points),
    }));
  } catch {
    return [];
  }
}

export async function fetchAllResults(season: string = "2026") {
  const calendar = await fetchCalendar(season);
  if (!calendar) return null;

  const results: Record<number, { id: string; points: number }[]> = {};
  for (const race of calendar) {
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));
    const res = await fetchResults(race.round, season);
    if (res.length > 0) {
      results[race.round] = res;
    }
  }
  return { calendar, results };
}

export { FALLBACK_RESULTS };
