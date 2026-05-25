/**
 * Turso (libSQL) implementations.
 * When deployed to Vercel, VERCEL env var is set to "1".
 * Uses @libsql/client which is SQLite-compatible and runs at the edge.
 */

import { createClient } from "@libsql/client";
import type { Race, RaceResult, Prediction, User, RaceWithResults } from "./types";
import { FALLBACK_CALENDAR_2026 } from "./constants";

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
      round_num INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      season INTEGER DEFAULT 2026
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS results (
      round_num INTEGER NOT NULL,
      position INTEGER NOT NULL,
      driver_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      PRIMARY KEY (round_num, position)
    )
  `);
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      race_name TEXT NOT NULL,
      picks TEXT NOT NULL,
      is_late INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, race_name)
    )
  `);

  // Seed calendar if empty
  const result = await turso.execute("SELECT COUNT(*) as count FROM races");
  const count = Number(result.rows[0]?.count ?? 0);
  if (count === 0) {
    for (const r of FALLBACK_CALENDAR_2026) {
      await turso.execute({
        sql: "INSERT INTO races (round_num, name, date) VALUES (?, ?, ?)",
        args: [r.round, r.name, r.date],
      });
    }
  }
}

// ─── Users ───────────────────────────────────────────────

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
  // Insert or reactivate user (without RETURNING for broader Turso compatibility)
  await turso.execute({
    sql: "INSERT INTO users (username) VALUES (?) ON CONFLICT(username) DO UPDATE SET is_active = 1",
    args: [username],
  });
  // Fetch the user back
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

export async function getRaces(): Promise<Race[]> {
  await ensureTables();
  const result = await turso.execute(
    "SELECT round_num, name, date FROM races ORDER BY round_num"
  );
  return result.rows.map((row) => ({
    round: Number(row.round_num),
    name: String(row.name),
    date: String(row.date),
  })) as Race[];
}

export async function upsertRace(round: number, name: string, date: string): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: "INSERT INTO races (round_num, name, date) VALUES (?, ?, ?) ON CONFLICT(round_num) DO UPDATE SET name = excluded.name, date = excluded.date",
    args: [round, name, date],
  });
}

export async function upsertRaces(races: Race[]): Promise<void> {
  await ensureTables();
  for (const r of races) {
    await turso.execute({
      sql: "INSERT INTO races (round_num, name, date) VALUES (?, ?, ?) ON CONFLICT(round_num) DO UPDATE SET name = excluded.name, date = excluded.date",
      args: [r.round, r.name, r.date],
    });
  }
}

// ─── Results ─────────────────────────────────────────────

export async function getResults(): Promise<Record<number, RaceResult[]>> {
  await ensureTables();
  const result = await turso.execute(
    "SELECT round_num, position, driver_id, points FROM results ORDER BY round_num, position"
  );
  const map: Record<number, RaceResult[]> = {};
  for (const row of result.rows) {
    const roundNum = Number(row.round_num);
    if (!map[roundNum]) map[roundNum] = [];
    map[roundNum].push({ id: String(row.driver_id), points: Number(row.points) });
  }
  return map;
}

export async function saveResults(round: number, results: RaceResult[]): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: "DELETE FROM results WHERE round_num = ?",
    args: [round],
  });
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    await turso.execute({
      sql: "INSERT INTO results (round_num, position, driver_id, points) VALUES (?, ?, ?, ?)",
      args: [round, i + 1, r.id, r.points],
    });
  }
}

// ─── Predictions ─────────────────────────────────────────

export async function getPredictions(): Promise<Prediction[]> {
  await ensureTables();
  const result = await turso.execute(`
    SELECT p.id, p.user_id, u.username, p.race_name, p.picks, p.is_late, p.created_at
    FROM predictions p JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `);
  return result.rows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    username: String(row.username),
    raceName: String(row.race_name),
    picks: JSON.parse(String(row.picks)),
    isLate: Boolean(row.is_late),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  })) as Prediction[];
}

export async function savePrediction(
  userId: number,
  raceName: string,
  picks: string[],
  isLate: boolean
): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: `INSERT INTO predictions (user_id, race_name, picks, is_late)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, race_name)
          DO UPDATE SET picks = excluded.picks, is_late = excluded.is_late`,
    args: [userId, raceName, JSON.stringify(picks), isLate ? 1 : 0],
  });
}

export async function removePrediction(userId: number, raceName: string): Promise<void> {
  await ensureTables();
  await turso.execute({
    sql: "DELETE FROM predictions WHERE user_id = ? AND race_name = ?",
    args: [userId, raceName],
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