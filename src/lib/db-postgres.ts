/**
 * Vercel Postgres implementations.
 * When deployed to Vercel, VERCEL env var is set to "1".
 * These functions use @vercel/postgres which handles connection pooling.
 */

import { sql } from "@vercel/postgres";
import type { Race, RaceResult, Prediction, User, RaceWithResults } from "./types";
import { FALLBACK_CALENDAR_2026 } from "./constants";

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS races (
      round_num INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      date DATE NOT NULL,
      season INTEGER DEFAULT 2026
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS results (
      round_num INTEGER NOT NULL,
      position INTEGER NOT NULL,
      driver_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      PRIMARY KEY (round_num, position)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      race_name TEXT NOT NULL,
      picks JSONB NOT NULL,
      is_late BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, race_name)
    );
  `;

  // Seed calendar if empty
  const result = await sql`SELECT COUNT(*)::int as count FROM races`;
  const count = result.rows[0]?.count ?? 0;
  if (count === 0) {
    for (const r of FALLBACK_CALENDAR_2026) {
      await sql`INSERT INTO races (round_num, name, date) VALUES (${r.round}, ${r.name}, ${r.date})`;
    }
  }
}

// ─── Users ───────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  await ensureTables();
  const { rows } = await sql`
    SELECT id, username, is_active as "isActive", created_at as "createdAt"
    FROM users WHERE is_active = TRUE ORDER BY username
  `;
  return rows as User[];
}

export async function addUser(username: string): Promise<User> {
  await ensureTables();
  const { rows } = await sql`
    INSERT INTO users (username) VALUES (${username})
    ON CONFLICT (username) DO UPDATE SET is_active = TRUE
    RETURNING id, username, is_active as "isActive", created_at as "createdAt"
  `;
  return rows[0] as User;
}

export async function removeUser(userId: number): Promise<void> {
  await ensureTables();
  await sql`UPDATE users SET is_active = FALSE WHERE id = ${userId}`;
}

// ─── Races ───────────────────────────────────────────────

export async function getRaces(): Promise<Race[]> {
  await ensureTables();
  const { rows } = await sql`
    SELECT round_num as round, name, date::text FROM races ORDER BY round_num
  `;
  return rows as Race[];
}

export async function upsertRace(round: number, name: string, date: string): Promise<void> {
  await ensureTables();
  await sql`INSERT INTO races (round_num, name, date) VALUES (${round}, ${name}, ${date}) ON CONFLICT (round_num) DO UPDATE SET name = ${name}, date = ${date}`;
}

export async function upsertRaces(races: Race[]): Promise<void> {
  await ensureTables();
  for (const r of races) {
    await sql`INSERT INTO races (round_num, name, date) VALUES (${r.round}, ${r.name}, ${r.date}) ON CONFLICT (round_num) DO UPDATE SET name = ${r.name}, date = ${r.date}`;
  }
}

// ─── Results ─────────────────────────────────────────────

export async function getResults(): Promise<Record<number, RaceResult[]>> {
  await ensureTables();
  const { rows } = await sql`
    SELECT round_num, position, driver_id, points FROM results ORDER BY round_num, position
  `;
  const map: Record<number, RaceResult[]> = {};
  for (const row of rows as { round_num: number; position: number; driver_id: string; points: number }[]) {
    if (!map[row.round_num]) map[row.round_num] = [];
    map[row.round_num].push({ id: row.driver_id, points: row.points });
  }
  return map;
}

export async function saveResults(round: number, results: RaceResult[]): Promise<void> {
  await ensureTables();
  // Delete existing results for this round
  await sql`DELETE FROM results WHERE round_num = ${round}`;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    await sql`INSERT INTO results (round_num, position, driver_id, points) VALUES (${round}, ${i + 1}, ${r.id}, ${r.points})`;
  }
}

// ─── Predictions ─────────────────────────────────────────

export async function getPredictions(): Promise<Prediction[]> {
  await ensureTables();
  const { rows } = await sql`
    SELECT p.id, p.user_id as "userId", u.username, p.race_name as "raceName",
           p.picks as picks, p.is_late as "isLate", p.created_at as "createdAt"
    FROM predictions p JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `;
  return rows.map((r) => ({
    ...r,
    picks: typeof r.picks === "string" ? JSON.parse(r.picks) : r.picks,
    isLate: Boolean(r.isLate),
  })) as Prediction[];
}

export async function savePrediction(userId: number, raceName: string, picks: string[], isLate: boolean): Promise<void> {
  await ensureTables();
  await sql`
    INSERT INTO predictions (user_id, race_name, picks, is_late)
    VALUES (${userId}, ${raceName}, ${JSON.stringify(picks)}::jsonb, ${isLate})
    ON CONFLICT (user_id, race_name)
    DO UPDATE SET picks = ${JSON.stringify(picks)}::jsonb, is_late = ${isLate}
  `;
}

export async function removePrediction(userId: number, raceName: string): Promise<void> {
  await ensureTables();
  await sql`DELETE FROM predictions WHERE user_id = ${userId} AND race_name = ${raceName}`;
}

// ─── API Cache (use an in-memory approach on Vercel) ────

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
