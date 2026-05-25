export const SITE_NAME = "Friendly Competition";
export const SITE_TAGLINE = "Fantasy leagues for the curious mind";

export const LEAGUE_F1 = "f1";

export const F1_POINTS: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
};

export const CURRENT_SEASON = new Date().getFullYear();

export const DRIVERS_BY_SEASON: Record<number, Driver[]> = {
  2026: [
    { code: "VER", name: "Max Verstappen", team: "Red Bull Racing", color: "#3671C6" },
    { code: "NOR", name: "Lando Norris", team: "McLaren", color: "#FF8000" },
    { code: "PIA", name: "Oscar Piastri", team: "McLaren", color: "#FF8000" },
    { code: "RUS", name: "George Russell", team: "Mercedes", color: "#27F4D2" },
    { code: "HAM", name: "Lewis Hamilton", team: "Ferrari", color: "#E8002D" },
    { code: "LEC", name: "Charles Leclerc", team: "Ferrari", color: "#E8002D" },
    { code: "SAI", name: "Carlos Sainz", team: "Williams", color: "#1868DB" },
    { code: "ALO", name: "Fernando Alonso", team: "Aston Martin", color: "#229971" },
    { code: "STR", name: "Lance Stroll", team: "Aston Martin", color: "#229971" },
    { code: "TSU", name: "Yuki Tsunoda", team: "Red Bull Racing", color: "#3671C6" },
    { code: "LAW", name: "Liam Lawson", team: "RB", color: "#6692FF" },
    { code: "HAD", name: "Isack Hadjar", team: "RB", color: "#6692FF" },
    { code: "ANT", name: "Andrea Kimi Antonelli", team: "Mercedes", color: "#27F4D2" },
    { code: "BEA", name: "Gabriel Bortoleto", team: "Kick Sauber", color: "#52E252" },
    { code: "HUL", name: "Nico Hulkenberg", team: "Kick Sauber", color: "#52E252" },
    { code: "GAS", name: "Pierre Gasly", team: "Alpine", color: "#0093CC" },
    { code: "OCO", name: "Esteban Ocon", team: "Haas", color: "#B6BABD" },
    { code: "MAG", name: "Kevin Magnussen", team: "Haas", color: "#B6BABD" },
    { code: "COL", name: "Franco Colapinto", team: "Alpine", color: "#0093CC" },
    { code: "BOT", name: "Valtteri Bottas", team: "Williams", color: "#1868DB" },
    { code: "ZHO", name: "Zhou Guanyu", team: "Kick Sauber", color: "#52E252" },
    { code: "PER", name: "Sergio Perez", team: "Red Bull Racing", color: "#3671C6" },
  ],
  2027: [],
};

export const FALLBACK_CALENDAR: Record<number, { round: number; name: string; date: string }[]> = {
  2026: [
    { round: 1, name: "Australian Grand Prix", date: "2026-03-08" },
    { round: 2, name: "Chinese Grand Prix", date: "2026-03-15" },
    { round: 3, name: "Japanese Grand Prix", date: "2026-03-29" },
    { round: 4, name: "Bahrain Grand Prix", date: "2026-04-12" },
    { round: 5, name: "Saudi Arabian Grand Prix", date: "2026-04-19" },
    { round: 6, name: "Miami Grand Prix", date: "2026-05-03" },
    { round: 7, name: "Emilia Romagna Grand Prix", date: "2026-05-17" },
    { round: 8, name: "Monaco Grand Prix", date: "2026-05-31" },
    { round: 9, name: "Spanish Grand Prix", date: "2026-06-07" },
    { round: 10, name: "Canadian Grand Prix", date: "2026-06-21" },
    { round: 11, name: "Austrian Grand Prix", date: "2026-07-05" },
    { round: 12, name: "British Grand Prix", date: "2026-07-19" },
    { round: 13, name: "Belgian Grand Prix", date: "2026-08-02" },
    { round: 14, name: "Hungarian Grand Prix", date: "2026-08-16" },
    { round: 15, name: "Dutch Grand Prix", date: "2026-08-30" },
    { round: 16, name: "Italian Grand Prix", date: "2026-09-06" },
    { round: 17, name: "Singapore Grand Prix", date: "2026-09-27" },
    { round: 18, name: "USA Grand Prix", date: "2026-10-18" },
    { round: 19, name: "Mexico City Grand Prix", date: "2026-11-01" },
    { round: 20, name: "Sao Paulo Grand Prix", date: "2026-11-15" },
    { round: 21, name: "Las Vegas Grand Prix", date: "2026-11-28" },
    { round: 22, name: "Abu Dhabi Grand Prix", date: "2026-12-06" },
  ],
  2027: [],
};

import type { Driver } from "./types";