# Friendly Competition

A fantasy F1 league app — predict the top 5 drivers for each Grand Prix and compete with friends.

![F1 Fantasy](https://img.shields.io/badge/F1-Fantasy-red)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- **🏆 Live Leaderboard** — Rankings with per-race breakdown and podium styling
- **📝 Prediction Submission** — Submit top-5 picks with driver quick-select and validation
- **📊 Prediction Viewer** — Browse any user's predictions with per-driver scoring breakdown
- **🏁 Race Info** — Full schedule with official results, refresh from Jolpica API
- **👥 User Management** — Add/remove users with driver code reference
- **🔄 Data Refresh** — Pull latest calendar and results from Jolpica API
- **📱 Responsive** — Works on desktop and mobile

## Scoring System

| Position | Points |
|----------|--------|
| P1 | 25 |
| P2 | 18 |
| P3 | 15 |
| P4 | 12 |
| P5 | 10 |

- **Correct driver + correct position** = full points
- **Correct driver, wrong position** (in top 5) = half points
- **Driver not in top 5** = 0 points
- **Late submission** (after qualifying) = 50% penalty
- **Missed race** = carry forward last picks with 50% penalty

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development

```bash
# Clone the repo
git clone https://github.com/zingarelho/friendly-competition.git
cd friendly-competition

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database auto-creates at `data/friendly.db` on first run, seeded with the 2026 F1 calendar.

### Build for Production

```bash
npm run build
npm start
```

## Deployment (Vercel)

1. Push to GitHub
2. Import into [Vercel](https://vercel.com)
3. Add a **Vercel Postgres** database (Dashboard → Storage → Postgres)
4. Deploy — the app auto-detects `VERCEL=1` and switches to Postgres

No code changes needed. Database tables are created automatically on first request.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | Production only | Auto-set by Vercel when Postgres is linked |

For local development, no environment variables are needed (SQLite is used automatically).

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── data/route.ts      ← Users & predictions CRUD
│   │   └── races/route.ts     ← Jolpica proxy + data refresh
│   ├── globals.css            ← Theme & animations
│   ├── layout.tsx             ← Root layout
│   └── page.tsx               ← Main dashboard
├── components/
│   ├── TabSwitcher.tsx
│   ├── Leaderboard.tsx
│   ├── RaceCard.tsx
│   ├── PredictionsView.tsx
│   ├── PredictionForm.tsx
│   ├── RaceInfo.tsx
│   └── UserManagement.tsx
├── hooks/
│   └── useAppData.ts          ← Central data hook
└── lib/
    ├── constants.ts           ← F1 driver codes, fallback calendar
    ├── types.ts               ← TypeScript interfaces
    ├── scoring.ts             ← Scoring engine
    ├── jolpica.ts             ← API client
    ├── db-sqlite.ts           ← Local database (SQLite)
    └── db-postgres.ts         ← Production database (Vercel Postgres)
```

## API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/races?action=races` | Races with results from DB |
| `GET /api/races?action=calendar` | Fetch calendar from Jolpica |
| `GET /api/races?action=results&round=N` | Fetch single race results |
| `GET /api/races?action=refresh` | Refresh all data from Jolpica |
| `GET /api/data?type=users` | List all users |
| `GET /api/data?type=predictions` | List all predictions |
| `POST /api/data` | Create user or prediction |
| `DELETE /api/data?type=user&userId=N` | Remove user |
| `DELETE /api/data?type=prediction&userId=N&raceName=X` | Remove prediction |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (local) / Vercel Postgres (production)
- **API**: Jolpica (F1 data)
- **Icons**: Lucide React

## License

MIT
