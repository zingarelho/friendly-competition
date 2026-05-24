# INCEPTION.md — Friendly Competition App

## Origin

This app was born from a code review of the original Streamlit-based F1 Fantasy League (`~/myfiles/friendly-competition/`). The Streamlit app worked but had architectural limitations: no proper routing, full page reloads on every interaction, no input validation, and JSON file storage that wouldn't survive server restarts.

The decision was made to rebuild from scratch as a proper web application.

---

## Original Review Findings (Streamlit Version)

### 🔴 Critical / Bugs

1. **No input validation on predictions** — Users could submit any text (e.g. `"VER,NOR,XYZ123,FOO,BAR"`) without error. Silently produced 0 points.
2. **`st.rerun()` on every interaction** — Delete/add user and delete prediction buttons caused full page flicker and re-fetched API data unnecessarily.
3. **No rate-limit handling** — `refresh_all_data()` fired 22 sequential API requests without delay, triggering empty-body responses from Jolpica.

### 🟡 Medium / UX Improvements

4. **No driver code reference** — Users had to guess 3-letter codes with no in-app reference.
5. **Leaderboard recalculated everything on every render** — No caching, redundant carry-forward scans.
6. **No pagination/collapsing for 22 races** — All cards rendered at once, including empty future races.
7. **Carry-forward was invisible** — Leaderboard silently applied carried-forward picks with no indicator.
8. **`refresh_all_data()` blocked the UI** — No progress indicator during 22-request sequential fetch.

### 🟢 Low / Nice-to-Have

9. **No data export** — Users couldn't export predictions or leaderboard.
10. **Hardcoded fallback calendar name mismatches** — API names vs fallback names could diverge.
11. **No season selection** — Hardcoded to 2026.
12. **Dead `status` field from API** — Parsed but never correctly provided by Jolpica.
13. **Sequential API calls** — No concurrency for fetching 22 rounds.

---

## Architecture Decisions

### Frontend: Next.js 14 + TypeScript + Tailwind v4

Chosen over HTMX+FastAPI (too JS-light for long-term growth) and staying with Streamlit (hitting walls). Next.js gives:
- Proper SPA navigation with no page reloads
- App Router with API routes colocated with UI
- 1M+ context window via Turbopack dev server
- First-class TypeScript support

### Persistence: Dual database (SQLite local / Vercel Postgres production)

Chosen over JSON files (not viable on serverless), Turso (extra dependency), or Supabase (overkill for now). The `VERCEL=1` env var auto-switches the DB layer:
- **Local dev**: SQLite via `better-sqlite3`, auto-seeds fallback calendar
- **Production**: Vercel Postgres via `@vercel/postgres`, auto-creates tables

### Design: F1.com Inspired

Dark theme (#0e0e0e), F1 Red (#e10600) accents, card-heavy layout, monospace numbers, uppercase tracking, gold/silver/bronze podium styling, animated tab underlines, hover glow effects.

### Scoring Engine: TypeScript port of f1_engine.py

Exact same logic: P1=25, P2=18, P3=15, P4=12, P5=10. Correct position = full points, correct driver wrong position = half points. Late/missing = 50% flat penalty (non-compounding). Carry-forward scans backwards through schedule.

---

## Folder Structure

```
src/
├── app/
│   ├── api/
│   │   ├── data/route.ts      ← CRUD: users, predictions
│   │   └── races/route.ts     ← Jolpica proxy, data refresh
│   ├── globals.css            ← Theme variables, animations
│   ├── layout.tsx             ← Root layout
│   └── page.tsx               ← Main dashboard (tabs)
├── components/
│   ├── TabSwitcher.tsx        ← Animated tab bar
│   ├── Leaderboard.tsx        ← Rankings + mini race grid
│   ├── RaceCard.tsx           ← Per-race card (results/predictions)
│   ├── PredictionsView.tsx    ← User prediction browser
│   ├── PredictionForm.tsx     ← Submit predictions + validation
│   ├── RaceInfo.tsx           ← Schedule + results
│   └── UserManagement.tsx     ← User CRUD + driver reference
├── hooks/
│   └── useAppData.ts          ← Central data hook
└── lib/
    ├── constants.ts           ← F1 data, driver codes, fallback calendar
    ├── types.ts               ← TypeScript interfaces
    ├── scoring.ts             ← Scoring engine (ported from Python)
    ├── jolpica.ts             ← Jolpica API client
    ├── db-sqlite.ts           ← SQLite data access (local dev)
    └── db-postgres.ts         ← Vercel Postgres data access (production)
```

---

## Deployment

- **Platform**: Vercel (serverless, edge-deployed)
- **Database**: Vercel Postgres (auto-provisioned, auto-connected)
- **Domain**: TBD (vercel.app subdomain by default)
- **CI/CD**: Git push → auto-deploy

---

## Future Evolution (from original review)

### Phase 1: Robustness ✅ (done in this rebuild)
- Input validation on predictions
- No page reloads (SPA architecture)
- Rate-limit handling in data refresh
- Driver code reference in UI

### Phase 2: Persistence ✅ (done in this rebuild)
- Google Sheets migration no longer needed — Vercel Postgres handles it

### Phase 3: Features (planned)
- Head-to-head duels per race
- Transfer/wildcard mechanic (one "joker" race per season with 2x points)
- Historical stats per user (accuracy rate, avg points, streaks)
- Telegram notifications when results are loaded

### Phase 4: Scale (if league grows)
- Multi-league support (different groups)
- Commissioner role with elevated permissions
- API layer (FastAPI) separate from Next.js UI
