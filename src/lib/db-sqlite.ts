import path from "path";
import { FALLBACK_CALENDAR_2026, F1_2026_DRIVERS } from "./constants";
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
      round_num INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      season INTEGER DEFAULT 2026
    );

    CREATE TABLE IF NOT EXISTS results (
      round_num INTEGER NOT NULL,
      position INTEGER NOT NULL,
      driver_id TEXT NOT NULL,
      points INTEGER NOT NULL,
      PRIMARY KEY (round_num, position),
      FOREIGN KEY (round_num) REFERENCES races(round_num)
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      race_name TEXT NOT NULL,
      picks TEXT NOT NULL,
      is_late INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, race_name)
    );

    CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed fallback calendar if empty
  const count = db.prepare("SELECT COUNT(*) as c FROM races").get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare("INSERT OR IGNORE INTO races (round_num, name, date) VALUES (?, ?, ?)");
    const txn = db.transaction((races: typeof FALLBACK_CALENDAR_2026) => {
      for (const r of races) {
        insert.run(r.round, r.name, r.date);
      }
    });
    txn(FALLBACK_CALENDAR_2026);
  }
}

// ─── Users ───────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  if (isVercel) {
    const { getUsers: pg } = await import("./db-postgres");
    return pg();
  }
  const db = await getSqliteDb();
  const rows = db.prepare("SELECT id, username, is_active as isActive, created_at as createdAt FROM users WHERE is_active = 1 ORDER BY username").all();
  return rows as User[];
}

export async function addUser(username: string): Promise<User> {
  if (isVercel) {
    const { addUser: pg } = await import("./db-postgres");
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
    const { removeUser: pg } = await import("./db-postgres");
    return pg(userId);
  }
  const db = await getSqliteDb();
  const txn = db.transaction(() => {
    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(userId);
  });
  txn();
}

// ─── Races ───────────────────────────────────────────────

export async function getRaces(): Promise<Race[]> {
  if (isVercel) {
    const { getRaces: pg } = await import("./db-postgres");
    return pg();
  }
  const db = await getSqliteDb();
  return db.prepare("SELECT round_num as round, name, date FROM races ORDER BY round_num").all() as Race[];
}

export async function upsertRace(round: number, name: string, date: string): Promise<void> {
  if (isVercel) {
    const { upsertRace: pg } = await import("./db-postgres");
    return pg(round, name, date);
  }
  const db = await getSqliteDb();
  db.prepare("INSERT OR REPLACE INTO races (round_num, name, date) VALUES (?, ?, ?)").run(round, name, date);
}

export async function upsertRaces(races: Race[]): Promise<void> {
  if (isVercel) {
    const { upsertRaces: pg } = await import("./db-postgres");
    return pg(races);
  }
  const db = await getSqliteDb();
  const stmt = db.prepare("INSERT OR REPLACE INTO races (round_num, name, date) VALUES (?, ?, ?)");
  const txn = db.transaction((r: Race[]) => {
    for (const race of r) {
      stmt.run(race.round, race.name, race.date);
    }
  });
  txn(races);
}

// ─── Results ─────────────────────────────────────────────

export async function getResults(): Promise<Record<number, RaceResult[]>> {
  if (isVercel) {
    const { getResults: pg } = await import("./db-postgres");
    return pg();
  }
  const db = await getSqliteDb();
  const rows = db.prepare("SELECT round_num, position, driver_id, points FROM results ORDER BY round_num, position").all() as {
    round_num: number; position: number; driver_id: string; points: number;
  }[];
  const map: Record<number, RaceResult[]> = {};
  for (const row of rows) {
    if (!map[row.round_num]) map[row.round_num] = [];
    map[row.round_num].push({ id: row.driver_id, points: row.points });
  }
  return map;
}

export async function saveResults(round: number, results: RaceResult[]): Promise<void> {
  if (isVercel) {
    const { saveResults: pg } = await import("./db-postgres");
    return pg(round, results);
  }
  const db = await getSqliteDb();
  const txn = db.transaction(() => {
    db.prepare("DELETE FROM results WHERE round_num = ?").run(round);
    const stmt = db.prepare("INSERT INTO results (round_num, position, driver_id, points) VALUES (?, ?, ?, ?)");
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      stmt.run(round, i + 1, r.id, r.points);
    }
  });
  txn();
}

// ─── Predictions ─────────────────────────────────────────

export async function getPredictions(): Promise<Prediction[]> {
  if (isVercel) {
    const { getPredictions: pg } = await import("./db-postgres");
    return pg();
  }
  const db = await getSqliteDb();
  const rows = db.prepare(`
    SELECT p.id, p.user_id as userId, u.username, p.race_name as raceName, p.picks, p.is_late as isLate, p.created_at as createdAt
    FROM predictions p JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `).all() as {
    id: number; userId: number; username: string; raceName: string; picks: string; isLate: number; createdAt: string;
  }[];
  return rows.map((r) => ({
    ...r,
    picks: JSON.parse(r.picks),
    isLate: Boolean(r.isLate),
  }));
}

export async function savePrediction(
  userId: number,
  raceName: string,
  picks: string[],
  isLate: boolean
): Promise<void> {
  if (isVercel) {
    const { savePrediction: pg } = await import("./db-postgres");
    return pg(userId, raceName, picks, isLate);
  }
  const db = await getSqliteDb();
  db.prepare(`
    INSERT OR REPLACE INTO predictions (user_id, race_name, picks, is_late)
    VALUES (?, ?, ?, ?)
  `).run(userId, raceName, JSON.stringify(picks), isLate ? 1 : 0);
}

export async function removePrediction(userId: number, raceName: string): Promise<void> {
  if (isVercel) {
    const { removePrediction: pg } = await import("./db-postgres");
    return pg(userId, raceName);
  }
  const db = await getSqliteDb();
  db.prepare("DELETE FROM predictions WHERE user_id = ? AND race_name = ?").run(userId, raceName);
}

// ─── Races with Results ──────────────────────────────────

export async function getRacesWithResults(): Promise<RaceWithResults[]> {
  const [races, resultsMap] = await Promise.all([getRaces(), getResults()]);
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
    const { getCachedData: pg } = await import("./db-postgres");
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
    const { setCachedData: pg } = await import("./db-postgres");
    return pg(key, data);
  }
  const db = await getSqliteDb();
  db.prepare("INSERT OR REPLACE INTO api_cache (key, data, fetched_at) VALUES (?, ?, datetime('now'))").run(key, JSON.stringify(data));
}
