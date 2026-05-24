# ARCHITECTURE.md — Friendly Competition

## Overview

**Friendly Competition** is a fantasy sports league platform built with Next.js 14. F1 is the first league supported. The app lets users predict the top-5 drivers for each Grand Prix and scores them based on prediction accuracy.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database (local) | SQLite via `better-sqlite3` |
| Database (prod) | Vercel Postgres via `@vercel/postgres` |
| Data Fetching | Native `fetch()` via custom hook |
| Icons | Lucide React |
| API | Jolpica (F1 data mirror of deprecated Ergast API) |

## System Diagram

```
┌─────────────────────────────────────────────────┐
│                  Browser (SPA)                   │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │TabSwitch │ │RaceCard  │ │ Leaderboard      │ │
│  │PredictForm│ │RaceInfo  │ │ PredictionsView  │ │
│  │UserMgmt  │ │          │ │                  │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       └─────────────┼────────────────┘           │
│                     ▼                            │
│            ┌────────────────┐                    │
│            │  useAppData()  │                    │
│            │  (data hook)   │                    │
│            └───────┬────────┘                    │
└────────────────────┼────────────────────────────┘
                     │ fetch()
                     ▼
┌─────────────────────────────────────────────────┐
│              Next.js API Routes                  │
│                                                  │
│  /api/races?action=calendar  ← Jolpica proxy    │
│  /api/races?action=results   ← Single race      │
│  /api/races?action=refresh   ← All data refresh │
│  /api/races?action=races     ← DB races+results │
│  /api/data?type=users        ← User CRUD        │
│  /api/data?type=predictions  ← Prediction CRUD  │
└────────────────────┬────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐  ┌──────────────────────┐
│  Vercel Postgres  │  │   SQLite (local)     │
│  (production)     │  │   data/friendly.db   │
│                   │  │                      │
│  • users          │  │  • users             │
│  • races          │  │  • races             │
│  • results        │  │  • results           │
│  • predictions    │  │  • predictions       │
│  (JSONB for picks)│  │  • api_cache         │
└──────────────────┘  └──────────────────────┘
```

## Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL / INTEGER PK | Auto-increment |
| username | TEXT UNIQUE | Display name |
| is_active | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Auto-set |

### races
| Column | Type | Notes |
|--------|------|-------|
| round_num | INTEGER PK | 1-22 for 2026 season |
| name | TEXT | e.g. "Monaco Grand Prix" |
| date | DATE | YYYY-MM-DD |
| season | INTEGER | Default 2026 |

### results
| Column | Type | Notes |
|--------|------|-------|
| round_num | INTEGER FK → races | |
| position | INTEGER | 1-5 |
| driver_id | TEXT | 3-letter code (e.g. "VER") |
| points | INTEGER | F1 points for position |
| **PK** | (round_num, position) | |

### predictions
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL / INTEGER PK | |
| user_id | FK → users | |
| race_name | TEXT | Race name (matches races.name) |
| picks | JSONB / TEXT JSON | Array of 5 driver codes |
| is_late | BOOLEAN | Post-qualifying penalty flag |
| created_at | TIMESTAMPTZ | |
| **UNIQUE** | (user_id, race_name) | One prediction per user per race |

## Data Flow

### Initial Load
1. `useAppData()` mounts and fires parallel requests:
   - `GET /api/races?action=races` → races + results from DB
   - `GET /api/data?type=users` → users from DB
   - `GET /api/data?type=predictions` → predictions from DB
2. Hook computes leaderboard from in-memory data (no server-side leaderboard calculation)
3. UI renders all tabs instantly from cached state

### Prediction Submission
1. User picks 5 drivers via text input or quick-select buttons → client-side validation (3-letter codes, no duplicates)
2. `POST /api/data` `{ type: "prediction", userId, raceName, picks, isLate }`
3. Server validates and upserts to DB
4. Hook re-fetches all data → UI updates without page refresh

### Data Refresh from Jolpica
1. User clicks "Refresh All Data"
2. `GET /api/races?action=refresh` fetches calendar + all round results from Jolpica
3. Server saves to DB (with 300ms delay between requests to avoid rate limiting)
4. Hook re-fetches from DB → UI updates

## Scoring Engine

Ported from `f1_engine.py` (Streamlit version) to TypeScript in `src/lib/scoring.ts`.

### Rules
- Only top 5 positions matter
- Points: P1=25, P2=18, P3=15, P4=12, P5=10
- **Correct driver in correct position** = full points
- **Correct driver in wrong position** (but in top 5) = half points
- **Driver not in top 5** = 0 points
- **Late penalty** (submitted after qualifying): 50% of earned points
- **Missing prediction**: carry forward last valid picks from a prior race → 50% penalty

### API
```typescript
calculatePoints(picks: string[], results: RaceResult[], isLate?: boolean, isMissing?: boolean): number

calculateDriverBreakdown(picks: string[], results: RaceResult[], isLate?: boolean, isMissing?: boolean): ScoredPrediction
```

## Environment Detection

The app auto-detects its environment:
```typescript
const isVercel = process.env.VERCEL === "1" || process.env.NEXT_PUBLIC_VERCEL === "1";
```

- **Local dev** (`VERCEL` not set): Uses `db-sqlite.ts` → `better-sqlite3` → `data/friendly.db`
- **Vercel production** (`VERCEL=1`): Uses `db-postgres.ts` → `@vercel/postgres` → Vercel Postgres

Both modules implement the same function signatures, making the swap transparent to API routes.

## Jolpica API Integration

### URL Format (critical)
- ✅ **Path-based**: `/f1/{season}/{round}/results.json` → returns exactly round N
- ❌ **Query-param**: `/f1/{season}/results.json?round=N` → returns ALL rounds from N onward (wrong!)

### Rate Limiting
Sequential requests include a 300ms delay. Empty-body responses (HTTP 200, no content) are handled gracefully — they return `[]` and the round shows as "Scheduled".

### Fallback Data
- **Calendar**: Hardcoded 2026 schedule (22 races) used when API is unreachable
- **Results**: No fallback for individual race results (empty = not yet run)

## Authentication

None. This is a private league app. Users are managed via the User Management tab with no login system. Usernames are unique identifiers.

## File Conventions

- `"use client"` directive on all components with state/interactivity
- `"use server"` not used — API routes handle server-side logic
- All data access goes through `useAppData()` hook — no direct API calls from components
- Types in `src/lib/types.ts` shared across client and server

## Performance Notes

- Leaderboard is computed client-side with `useMemo` (recipes × users is small)
- No server-side rendering of leaderboard (avoids recalculation on every request)
- Race cards use CSS animations (GPU-accelerated) rather than JS animations
- `st.rerun()` anti-pattern from Streamlit version is eliminated — no full page reloads
