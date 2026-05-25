/**
 * Turso (libSQL) implementations.
 * When deployed to Vercel, VERCEL env var is set to "1".
 * Uses @libsql/client which is SQLite-compatible and runs at the edge.
 */

import { createClient } from "@libsql/client";
import type { Race, RaceResult, Prediction, User, RaceWithResults } from "./types";
import { FALLBACK_CALENDAR } from "./constants";

const TURSO_URL = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN ?? "";

const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

async function ensureTables() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS races (
      season INTEGER NOT NULL,
      round_num INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (season, round_num)
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS results (
      season INTEGER NOT NULL,
      round_num INTEGER NOT NULL,
      position INTEGER NOT NULL,
      driver_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      PRIMARY KEY (season, round_num, position)
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      season INTEGER NOT NULL,
      race_name TEXT NOT NULL,
      picks TEXT NOT NULL,
      is_late INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, season, race_name)
    )
  `);
}

// ─── Users (season-independent) ──────────────────────────

export async function getUsers(): Promise<User[]> {
  await ensureTables();
  const result = await turso.execute(
    "SELECT id, username, is_active, created_at FROM users WHERE is_active = 1 ORDER BY username"
  );
  return result.rows.map((row) => ({
    id: Number(row.id),
    username: String(row.username),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  })) as User[];
}

export async function addUser(username: string): Promise<User> {
  await ensureTables();
  await turso.execute({
    sql: "INSERT INTO users (username) VALUES (?) ON CONFLICT(username) DO UPDATE SET is_active = 1",
    args: [username],
  });
  const result = await turso.execute({
    sql: "SELECT id, username, is_active, created_at FROM users WHERE username = ?",
    args: [username],
  });
  const row = result.rows[0];
  if (!row) throw new Error("User not found after insert");
  return {
    id: Number(row.id),
    username: String(row.username),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  } as User;
}

export async function removeUser(userId: number): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: "UPDATE users SET is_active = 0 WHERE id = ?",
    args: [userId],
  });
}

// ─── Races ───────────────────────────────────────────────

export async function getRaces(season: number): Promise<Race[]> {
  await ensureTables();
  const result = await turso.execute({
    sql: "SELECT season, round_num, name, date FROM races WHERE season = ? ORDER BY round_num",
    args: [season],
  });
  return result.rows.map((row) => ({
    season: Number(row.season),
    round: Number(row.round_num),
    name: String(row.name),
    date: String(row.date),
  })) as Race[];
}

export async function upsertRace(season: number, round: number, name: string, date: string): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: "INSERT INTO races (season, round_num, name, date) VALUES (?, ?, ?, ?) ON CONFLICT(season, round_num) DO UPDATE SET name = excluded.name, date = excluded.date",
    args: [season, round, name, date],
  });
}

export async function upsertRaces(season: number, races: Race[]): Promise<void> {
  await ensureTables();
  for (const r of races) {
    await turso.execute({
      sql: "INSERT INTO races (season, round_num, name, date) VALUES (?, ?, ?, ?) ON CONFLICT(season, round_num) DO UPDATE SET name = excluded.name, date = excluded.date",
      args: [season, r.round, r.name, r.date],
    });
  }
}

export async function seedFallbackCalendar(season: number): Promise<void> {
  await ensureTables();
  const calendar = FALLBACK_CALENDAR[season];
  if (!calendar || calendar.length === 0) return;
  const result = await turso.execute({
    sql: "SELECT COUNT(*) as count FROM races WHERE season = ?",
    args: [season],
  });
  const count = Number(result.rows[0]?.count ?? 0);
  if (count > 0) return;
  for (const r of calendar) {
    await turso.execute({
      sql: "INSERT OR IGNORE INTO races (season, round_num, name, date) VALUES (?, ?, ?, ?)",
      args: [season, r.round, r.name, r.date],
    });
  }
}

// ─── Results ─────────────────────────────────────────────

export async function getResults(season: number): Promise<Record<number, RaceResult[]>> {
  await ensureTables();
  const result = await turso.execute({
    sql: "SELECT round_num, position, driver_id, points FROM results WHERE season = ? ORDER BY round_num, position",
    args: [season],
  });
  const map: Record<number, RaceResult[]> = {};
  for (const row of result.rows) {
    const roundNum = Number(row.round_num);
    if (!map[roundNum]) map[roundNum] = [];
    map[roundNum].push({ id: String(row.driver_id), points: Number(row.points) });
  }
  return map;
}

export async function saveResults(season: number, round: number, results: RaceResult[]): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: "DELETE FROM results WHERE season = ? AND round_num = ?",
    args: [season, round],
  });
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    await turso.execute({
      sql: "INSERT INTO results (season, round_num, position, driver_id, points) VALUES (?, ?, ?, ?, ?)",
      args: [season, round, i + 1, r.id, r.points],
    });
  }
}

// ─── Predictions ─────────────────────────────────────────

export async function getPredictions(season?: number): Promise<Prediction[]> {
  await ensureTables();
  let sql: string;
  let args: any[];
  if (season) {
    sql = `SELECT p.id, p.user_id, u.username, p.season, p.race_name, p.picks, p.is_late, p.created_at
           FROM predictions p JOIN users u ON p.user_id = u.id
           WHERE p.season = ?
           ORDER BY p.created_at DESC`;
    args = [season];
  } else {
    sql = `SELECT p.id, p.user_id, u.username, p.season, p.race_name, p.picks, p.is_late, p.created_at
           FROM predictions p JOIN users u ON p.user_id = u.id
           ORDER BY p.created_at DESC`;
    args = [];
  }
  const result = await turso.execute({ sql, args });
  return result.rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    username: String(row.username),
    season: Number(row.season),
    raceName: String(row.race_name),
    picks: JSON.parse(String(row.picks)),
    isLate: Boolean(row.is_late),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  })) as Prediction[];
}

export async function savePrediction(
  userId: number,
  season: number,
  raceName: string,
  picks: string[],
  isLate: boolean
): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: `INSERT INTO predictions (user_id, season, race_name, picks, is_late)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, season, race_name)
          DO UPDATE SET picks = excluded.picks, is_late = excluded.is_late`,
    args: [userId, season, JSON.stringify(picks), isLate ? 1 : 0],
  });
}

export async function removePrediction(userId: number, season: number, raceName: string): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: "DELETE FROM predictions WHERE user_id = ? AND season = ? AND race_name = ?",
    args: [userId, season, raceName],
  });
}

// ─── Races with Results ──────────────────────────────────

export async function getRacesWithResults(season: number): Promise<RaceWithResults[]> {
  const [races, resultsMap] = await Promise.all([getRaces(season), getResults(season)]);
  return races.map((race) => {
    const res = resultsMap[race.round] ?? [];
    return {
      ...race,
      results: res,
      status: res.length > 0 ? ("finished" as const) : ("scheduled" as const),
    };
  });
}

// ─── API Cache (in-memory on serverless) ─────────────────

const memoryCache = new Map<string, { data: unknown; timestamp: number }>();

export async function getCachedData<T>(key: string, maxAgeMs: number = 300000): Promise<T | null> {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) return null;
  return entry.data as T;
}

export async function setCachedData(key: string, data: unknown): Promise<void> {
  memoryCache.set(key, { data, timestamp: Date.now() });
}