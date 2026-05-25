import path from "path";
import { FALLBACK_CALENDAR } from "./constants";
import type { Race, RaceResult, Prediction, User, RaceWithResults } from "./types";

const isVercel = process.env.VERCEL === "1" || process.env.NEXT_PUBLIC_VERCEL === "1";

let sqliteDb: import("better-sqlite3").Database | null = null;

async function getSqliteDb(): Promise<import("better-sqlite3").Database> {
  if (!sqliteDb) {
    const { default: Database } = await import("better-sqlite3");
    const dbPath = path.join(process.cwd(), "data", "friendly.db");
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("foreign_keys = ON");
    initializeSqliteTables(sqliteDb);
  }
  return sqliteDb;
}

function initializeSqliteTables(db: import("better-sqlite3").Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS races (
      season INTEGER NOT NULL,
      round_num INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (season, round_num)
    );

    CREATE TABLE IF NOT EXISTS results (
      season INTEGER NOT NULL,
      round_num INTEGER NOT NULL,
      position INTEGER NOT NULL,
      driver_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      PRIMARY KEY (season, round_num, position),
      FOREIGN KEY (season, round_num) REFERENCES races(season, round_num)
    );

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
    );

    CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ─── Users (season-independent) ──────────────────────────

export async function getUsers(): Promise<User[]> {
  if (isVercel) {
    const { getUsers: pg } = await import("./db-turso");
    return pg();
  }
  const db = await getSqliteDb();
  const rows = db.prepare("SELECT id, username, is_active as isActive, created_at as createdAt FROM users WHERE is_active = 1 ORDER BY username").all();
  return rows as User[];
}

export async function addUser(username: string): Promise<User> {
  if (isVercel) {
    const { addUser: pg } = await import("./db-turso");
    return pg(username);
  }
  const db = await getSqliteDb();
  const stmt = db.prepare("INSERT OR IGNORE INTO users (username) VALUES (?)");
  stmt.run(username);
  const user = db.prepare("SELECT id, username, is_active as isActive, created_at as createdAt FROM users WHERE username = ?").get(username);
  return user as User;
}

export async function removeUser(userId: number): Promise<void> {
  if (isVercel) {
    const { removeUser: pg } = await import("./db-turso");
    return pg(userId);
  }
  const db = await getSqliteDb();
  const txn = db.transaction(() => {
    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(userId);
  });
  txn();
}

// ─── Races ───────────────────────────────────────────────

export async function getRaces(season: number): Promise<Race[]> {
  if (isVercel) {
    const { getRaces: pg } = await import("./db-turso");
    return pg(season);
  }
  const db = await getSqliteDb();
  return db.prepare("SELECT season, round_num as round, name, date FROM races WHERE season = ? ORDER BY round_num").all(season) as Race[];
}

export async function upsertRace(season: number, round: number, name: string, date: string): Promise<void> {
  if (isVercel) {
    const { upsertRace: pg } = await import("./db-turso");
    return pg(season, round, name, date);
  }
  const db = await getSqliteDb();
  db.prepare("INSERT OR REPLACE INTO races (season, round_num, name, date) VALUES (?, ?, ?, ?)").run(season, round, name, date);
}

export async function upsertRaces(season: number, races: Race[]): Promise<void> {
  if (isVercel) {
    const { upsertRaces: pg } = await import("./db-turso");
    return pg(season, races);
  }
  const db = await getSqliteDb();
  const stmt = db.prepare("INSERT OR REPLACE INTO races (season, round_num, name, date) VALUES (?, ?, ?, ?)");
  const txn = db.transaction((r: Race[]) => {
    for (const race of r) {
      stmt.run(season, race.round, race.name, race.date);
    }
  });
  txn(races);
}

export async function seedFallbackCalendar(season: number): Promise<void> {
  if (isVercel) {
    const { seedFallbackCalendar: pg } = await import("./db-turso");
    return pg(season);
  }
  const calendar = FALLBACK_CALENDAR[season];
  if (!calendar || calendar.length === 0) return;
  const db = await getSqliteDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM races WHERE season = ?").get(season) as { c: number }).c;
  if (count > 0) return;
  const stmt = db.prepare("INSERT OR IGNORE INTO races (season, round_num, name, date) VALUES (?, ?, ?, ?)");
  const txn = db.transaction(() => {
    for (const r of calendar) {
      stmt.run(season, r.round, r.name, r.date);
    }
  });
  txn();
}

// ─── Results ─────────────────────────────────────────────

export async function getResults(season: number): Promise<Record<number, RaceResult[]>> {
  if (isVercel) {
    const { getResults: pg } = await import("./db-turso");
    return pg(season);
  }
  const db = await getSqliteDb();
  const rows = db.prepare("SELECT round_num, position, driver_id, points FROM results WHERE season = ? ORDER BY round_num, position").all(season) as {
    round_num: number; position: number; driver_id: string; points: number;
  }[];
  const map: Record<number, RaceResult[]> = {};
  for (const row of rows) {
    if (!map[row.round_num]) map[row.round_num] = [];
    map[row.round_num].push({ id: row.driver_id, points: row.points });
  }
  return map;
}

export async function saveResults(season: number, round: number, results: RaceResult[]): Promise<void> {
  if (isVercel) {
    const { saveResults: pg } = await import("./db-turso");
    return pg(season, round, results);
  }
  const db = await getSqliteDb();
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM results WHERE season = ? AND round_num = ?").run(season, round);
    const stmt = db.prepare("INSERT INTO results (season, round_num, position, driver_id, points) VALUES (?, ?, ?, ?, ?)");
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      stmt.run(season, round, i + 1, r.id, r.points);
    }
  });
  txn();
}

// ─── Predictions ─────────────────────────────────────────

export async function getPredictions(season?: number): Promise<Prediction[]> {
  if (isVercel) {
    const { getPredictions: pg } = await import("./db-turso");
    return pg(season);
  }
  const db = await getSqliteDb();
  const sql = season
    ? `SELECT p.id, p.user_id as userId, u.username, p.season, p.race_name as raceName, p.picks, p.is_late as isLate, p.created_at as createdAt
       FROM predictions p JOIN users u ON p.user_id = u.id
       WHERE p.season = ?
       ORDER BY p.created_at DESC`
    : `SELECT p.id, p.user_id as userId, u.username, p.season, p.race_name as raceName, p.picks, p.is_late as isLate, p.created_at as createdAt
       FROM predictions p JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`;
  const rows = season
    ? db.prepare(sql).all(season)
    : db.prepare(sql).all();
  return (rows as any[]).map((r) => ({
    ...r,
    picks: JSON.parse(r.picks),
    isLate: Boolean(r.isLate),
  })) as Prediction[];
}

export async function savePrediction(
  userId: number,
  season: number,
  raceName: string,
  picks: string[],
  isLate: boolean
): Promise<void> {
  if (isVercel) {
    const { savePrediction: pg } = await import("./db-turso");
    return pg(userId, season, raceName, picks, isLate);
  }
  const db = await getSqliteDb();
  db.prepare(`
    INSERT OR REPLACE INTO predictions (user_id, season, race_name, picks, is_late)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, season, raceName, JSON.stringify(picks), isLate ? 1 : 0);
}

export async function removePrediction(userId: number, season: number, raceName: string): Promise<void> {
  if (isVercel) {
    const { removePrediction: pg } = await import("./db-turso");
    return pg(userId, season, raceName);
  }
  const db = await getSqliteDb();
  db.prepare("DELETE FROM predictions WHERE user_id = ? AND season = ? AND race_name = ?").run(userId, season, raceName);
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

// ─── API Cache ───────────────────────────────────────────

export async function getCachedData<T>(key: string, maxAgeMs: number = 300000): Promise<T | null> {
  if (isVercel) {
    const { getCachedData: pg } = await import("./db-turso");
    return pg<T>(key, maxAgeMs);
  }
  const db = await getSqliteDb();
  const row = db.prepare("SELECT data, fetched_at FROM api_cache WHERE key = ?").get(key) as { data: string; fetched_at: string } | undefined;
  if (!row) return null;
  const age = Date.now() - new Date(row.fetched_at).getTime();
  if (age > maxAgeMs) return null;
  return JSON.parse(row.data) as T;
}

export async function setCachedData(key: string, data: unknown): Promise<void> {
  if (isVercel) {
    const { setCachedData: pg } = await import("./db-turso");
    return pg(key, data);
  }
  const db = await getSqliteDb();
  db.prepare("INSERT OR REPLACE INTO api_cache (key, data, fetched_at) VALUES (?, ?, datetime('now'))").run(key, JSON.stringify(data));
}