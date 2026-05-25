# Multi-Year Support Plan

## Goal
Allow the Friendly Competition F1 app to support multiple seasons (2026, 2027, etc.) so users can make predictions, view leaderboards, and browse race data across years.

---

## 1. Database Schema Changes

### Problem
The current schema has composite primary keys that don't include `season`, causing collisions when a new year rolls around:

| Table | Current Key | Issue |
|-------|-------------|-------|
| `races` | `PRIMARY KEY (round_num)` | Round 1 exists in 2026 AND 2027 |
| `results` | `PRIMARY KEY (round_num, position)` | Same round = same result across years |
| `predictions` | `UNIQUE(user_id, race_name)` | "Bahrain Grand Prix" exists every year |

### Solution
Add `season` to all composite keys:

```sql
-- races
PRIMARY KEY (season, round_num)

-- results
PRIMARY KEY (season, round_num, position)

-- predictions
UNIQUE(user_id, season, race_name)
```

**Files to change:**
- `src/lib/db-turso.ts` — `ensureTables()` CREATE TABLE statements
- `src/lib/db-sqlite.ts` — `initializeSqliteTables()` CREATE TABLE statements

### Migration Strategy
Since this app is still early (2026 season only), simplest approach is to:
1. Drop and recreate tables (data loss — acceptable pre-production)
2. Or alter tables to add season to the PK (complex, error-prone)
3. **Recommendation**: Backup current data, drop tables, let the app recreate them on first deploy

---

## 2. Type System Changes

### `src/lib/types.ts`
Add `season` field to core types:

```typescript
export interface Race {
  round: number;
  name: string;
  date: string;
  season: number;          // NEW
}

export interface Prediction {
  id?: number;
  userId: number;
  username: string;
  raceName: string;
  season: number;          // NEW
  picks: string[];
  isLate: boolean;
  createdAt?: string;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  season: number;           // NEW
  totalPoints: number;
  racePoints: Record<number, number>;
}
```

### `RaceWithResults`
No change needed — it extends `Race` which will now carry `season`.

---

## 3. Constants Changes

### `src/lib/constants.ts`

**Replace hardcoded calendar with a keyed structure:**

```typescript
export const SEASONS = [2026, 2027];

export const FALLBACK_CALENDAR: Record<number, typeof FALLBACK_CALENDAR_2026> = {
  2026: [
    { round: 1, name: "Bahrain Grand Prix", date: "2026-03-01" },
    // ... existing 2026 calendar
  ],
  // 2027 data will be populated when the season starts
  2027: [],
};
```

**Replace `F1_2026_DRIVERS` with a season-aware structure:**
Driver lineups change every year (team moves, rookies, retirements). Store per-season:

```typescript
export const DRIVERS_BY_SEASON: Record<number, Driver[]> = {
  2026: [
    { code: "VER", name: "Max Verstappen", team: "Red Bull Racing", color: "#3671C6" },
    // ... rest of 2026 drivers
  ],
  2027: [], // Populated when season starts
};
```

Or keep a single `F1_DRIVERS` with a `seasons` field:
```typescript
export const F1_DRIVERS = [
  { code: "VER", name: "Max Verstappen", team: "Red Bull Racing", color: "#3671C6", seasons: [2026, 2027] },
  // ...
];
```

**Recommendation**: Use the `DRIVERS_BY_SEASON` approach — cleaner separation, easier to add/replace drivers per year.

---

## 4. Database Access Layer Changes

### `src/lib/db-turso.ts` & `src/lib/db-sqlite.ts`

Every function needs a `season` parameter added. Quick reference of all functions and their changes:

| Function | Current Signature | New Signature |
|----------|-----------------|---------------|
| `ensureTables`/`initializeSqliteTables` | No args | No args (schema changes only) |
| `getRaces` | `(): Promise<Race[]>` | `(season: number): Promise<Race[]>` |
| `upsertRace` | `(round, name, date)` | `(season, round, name, date)` |
| `upsertRaces` | `(races: Race[])` | `(season: number, races: Race[])` |
| `getResults` | `(): Promise<Record<number, RaceResult[]>>` | `(season: number): ...` |
| `saveResults` | `(round, results)` | `(season, round, results)` |
| `getPredictions` | `(): Promise<Prediction[]>` | `(season: number): ...` |
| `savePrediction` | `(userId, raceName, picks, isLate)` | `(userId, season, raceName, picks, isLate)` |
| `removePrediction` | `(userId, raceName)` | `(userId, season, raceName)` |
| `getRacesWithResults` | `()` | `(season: number)` |
| `getCachedData` | `(key, maxAgeMs?)` | No change needed |
| `setCachedData` | `(key, data)` | No change needed |
| `getUsers` / `addUser` / `removeUser` | Current | No change (users are global) |

**Seed logic change** (in `ensureTables`): Check if races exist for a given season, not just if any races exist at all.

---

## 5. Jolpica API Changes

### `src/lib/jolpica.ts`
The Jolpica API already supports a `season` parameter — no code changes needed here. The functions already accept season:

```typescript
export async function fetchCalendar(season: string = "2026") { ... }
export async function fetchResults(round: number, season: string = "2026") { ... }
export async function fetchAllResults(season: string = "2026") { ... }
```

The default value should change from `"2026"` to `String(new Date().getFullYear())` for future-proofing, but the real fix is making the caller always pass an explicit season.

---

## 6. API Route Changes

### `src/app/api/races/route.ts`

Currently accepts `?season=` in the URL but defaults to `"2026"`. Need to:

- Make the season parameter required (or default to current year)
- Pass `season` through to all database calls
- Pass `season` through to Jolpica API calls

```typescript
const season = parseInt(searchParams.get("season") || String(new Date().getFullYear()));
```

### `src/app/api/data/route.ts`
The data API route handles users, predictions CRUD. Need to:
- Accept `season` parameter for prediction operations
- Pass season to DB functions
- Return season in prediction responses

---

## 7. State Management Changes

### `src/hooks/useAppData.ts`

- Add `activeSeason` state (default: current year)
- Add `setActiveSeason` function
- Pass `season` parameter to all API calls
- Recalculate leaderboard when season changes
- `refreshFromAPI` should pass the current season
- `calculateLeaderboard` should filter by season

---

## 8. UI Changes

### Season Switcher (New Component)
Create a `SeasonSwitcher` component:

```
┌──────────────────────┐
│  ┌─────┐ ┌─────┐     │
│  │2026 │ │2027 │     │
│  └─────┘ └─────┘     │
│       + Add Season   │
└──────────────────────┘
```

- Sticky season selector in the header bar
- Shows available seasons from the database
- "+ Add Season" creates a new empty season
- Active season is highlighted
- All data reloads when season changes

### `src/app/page.tsx`

- Add `activeSeason` state
- Pass `season` to `useAppData()`
- Show season in the header: "Fantasy F1 League • 2026"
- Add season switcher to the header
- Show season in the tab navigation

### `src/components/PredictionForm.tsx`
- Include season in prediction submission
- Show season for each race in the select dropdown
- Filter races by active season

### `src/components/PredictionsView.tsx`
- Group predictions by season
- Show season label in the cards
- Filter by active season

### `src/components/Leaderboard.tsx`
- Recalculate leaderboard based on active season
- Show season selector or season label
- Allow viewing previous season's leaderboard

### `src/components/RaceInfo.tsx`
- Fetch races for active season
- Show season context (e.g., "2026 Season — Round 5")

### `src/components/RaceCard.tsx`
- Ensure race cards show season info
- Make round numbers relative to season

---

## 9. Scoring Logic Changes

### `src/lib/scoring.ts`
The scoring logic is season-agnostic (it operates on `prediction: string[]` and `officialResults: RaceResult[]`). **No changes needed here.** The season filtering happens before scoring.

---

## 10. Deployment & Data Migration

### If app has active data (users + predictions):
1. Export current data as JSON backup
2. Apply schema migration (drop/add tables)
3. Re-import data with season=2026 added
4. Deploy updated code

### If app has no active data:
1. Deploy code with schema changes
2. First user action: select "2026" season
3. Data auto-populates via Jolpica API or fallback calendar

---

## 11. Implementation Order

### Phase 1 (Foundation)
1. Update types (`types.ts`) — add `season` field
2. Update database schemas (`db-turso.ts`, `db-sqlite.ts`) — add season to PKs
3. Update constants (`constants.ts`) — `FALLBACK_CALENDAR` keyed by season, `DRIVERS_BY_SEASON`
4. Update DB access functions — add season param to all queries
5. Update Jolpica API usage — pass season explicitly

### Phase 2 (API Layer)
6. Update `races/route.ts` — pass season through
7. Update `data/route.ts` — accept season for predictions
8. Add season validation

### Phase 3 (Frontend)
9. Add `activeSeason` state to `useAppData.ts`
10. Create `SeasonSwitcher` component
11. Update `page.tsx` — season in header + switcher
12. Update all components — filter by season
13. Update leaderboard — season-aware scoring

### Phase 4 (Polish)
14. Add "copy previous season" feature — clone drivers/calendar from last year
15. Add season archive view — view historical data read-only
16. Handle season transitions — what happens when 2027 calendar isn't released yet
17. Tests for multi-year scenarios

---

## 12. Edge Cases to Consider

| Scenario | Handling |
|----------|----------|
| 2027 season hasn't started yet | Show "2027 season data coming soon" — no races, no predictions |
| User wants predictions across seasons | Keep predictions per-season — switch season to see them |
| Drivers change teams between years | `DRIVERS_BY_SEASON` handles this naturally |
| Calendar format changes (new rounds, dropped GPs) | `FALLBACK_CALENDAR` per season handles this |
| Jolpica API doesn't have 2027 data yet | Fallback to empty calendar, user can manually seed |
| Deleting a season | Cascade delete: races → results → predictions for that season |
| Adding a mid-season | User seeds via "+ Add Season" → "Copy from 2026" → adjusts manually |

---

## 13. Key Design Decisions

### Why `season` as a number (not a separate table)?
- Keeps queries simple: `WHERE season = 2026`
- No JOIN overhead
- Easy to filter, group, and order

### Why `DRIVERS_BY_SEASON` instead of a single driver registry?
- Driver lineups change year-to-year
- Prevents showing 2027 drivers for 2026 predictions
- Easy to update per-season without breaking historical data

### Why per-season predictions (not global)?
- A prediction for "Bahrain Grand Prix 2026" is different from "Bahrain Grand Prix 2027"
- Keeps leaderboards clean per-season
- Users can reference past season predictions

### Season as primary navigation (not secondary filter)?
- The app is a season-based league — the season is the primary context
- Everything (races, predictions, leaderboard) makes sense only within a season
- Season switcher should be as prominent as tab navigation
