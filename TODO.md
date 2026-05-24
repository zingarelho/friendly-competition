# TODO.md — Friendly Competition

## Completed (In this rebuild)

### ✅ Robustness
- Input validation on predictions (exactly 5 unique 3-letter codes)
- Eliminated `st.rerun()` churn — SPA with client-side state, no full page reloads
- Rate-limit handling in data refresh (300ms delay between Jolpica requests)
- Driver code reference in UI (User Management tab)

### ✅ Persistence
- Dual database: SQLite for local dev, Vercel Postgres for production
- Auto-switching via `VERCEL=1` environment variable
- Tables auto-created on first request
- Fallback calendar seeded automatically

### ✅ Architecture
- Next.js 14 (App Router) + TypeScript + Tailwind v4
- F1.com inspired dark theme with animations
- Jolpica API proxy with caching
- Ported scoring engine from Streamlit version to TypeScript
- Central data hook (`useAppData`) for consistent state

## Phase 1: Immediate Enhancements (Next Sprint)

### 🔧 Bug Fixes & Polish
- [ ] Add toast notifications for success/error states (currently using inline status)
- [ ] Optimize leaderboard calculation with `useMemo` (already implemented, verify)
- [ ] Add loading skeletons for race cards during data fetch
- [ ] Handle JWT expiration for Vercel Postgres (if applicable)
- [ ] Add form reset after successful prediction submission
- [ ] Validate that duplicate prediction prevention works (unique constraint)

### 📱 Mobile Responsiveness
- [ ] Test and adjust tab layout on narrow screens
- [ ] Ensure quick-select driver buttons wrap properly
- [ ] Optimize touch targets for prediction form inputs

### 📊 Features
- [ ] Add "My Prediction" highlight in Predictions tab when viewing own picks
- [ ] Show "Carried from" source race in Predictions tab tooltip
- [ ] Add season selector (2026, 2025, etc.) — start with 2026 only
- [ ] Export leaderboard as CSV button
- [ ] Add "Last refreshed" timestamp in Race Info tab

## Phase 2: Core Features (Next Quarter)

### 🏆 Competition Mechanics
- [ ] Head-to-head duels: Pair users randomly each round, track win/loss record
- [ ] Transfer/Wildcard: Allow one "joker" race per season where points are doubled
- [ ] League settings: Adjustable scoring system (e.g., custom points per position)
- [ ] Tie-breaking rules: Most correct P1s, then P2s, etc.

### 📈 Analytics & History
- [ ] User profile page: accuracy rate, average points, best/worst race, streak tracking
- [ ] League-wide stats: most predicted driver, biggest upset, highest scoring race
- [ ] Historical comparison: view past seasons (if we expand beyond 2026)
- [ ] Prediction change history: show how user's picks evolved over time

### 🔔 Notifications & Engagement
- [ ] Telegram bot integration: notify when results are loaded for a race
- [ ] Email reminders: 1 hour before qualifying deadline
- [ ] In-app notifications: new comment/reply (if we add social features)
- [ ] Achievement badges: "Perfect Prediction", "3-Race Streak", etc.

## Phase 3: Scale & Ecosystem (Long-term)

### 🌐 Multi-League Support
- [ ] Multiple leagues per user (different groups of friends)
- [ ] League discovery: public leagues to join
- [ ] Commissioner role: manage users, reset data, adjust settings
- [ ] League invitations via link or code

### 🔧 Technical Improvements
- [ ] Migrate to full-stack monorepo with Next.js + FastAPI (if complexity grows)
- [ ] Add WebSocket for real-time updates (live leaderboard during race)
- [ ] Implement optimistic updates in prediction form
- [ ] Add automated testing (Jest + React Testing Library)
- [ ] Set up CI/CD pipeline with preview deployments on PRs

### 📱 Mobile App
- [ ] React Native wrapper for iOS/Android
- [ ] Offline caching of predictions and calendar
- [ ] Push notifications for race results

## Non-Goals (Explicitly Out of Scope)

- ❌ Real-time telemetry during races (too complex, not core to fantasy)
- ❌ Betting or monetary stakes (purely recreational)
- ❌ Admin dashboard beyond commissioner tools
- ❌ Social media sharing (focus on private league experience)
- ❌ AI-generated predictions (keep it human-driven)

## Definition of Done

Each item is done when:
1. Code is written and tested locally
2. Pull request opened with clear description
3. At least one approving review (self-review acceptable for solo work)
4. Merged to main and deployed to preview
5. Verified in production (if applicable)
6. Documentation updated (if user-facing)

## References

- Original code review: see INCEPTION.md for detailed findings
- Architecture decisions: see ARCHITECTURE.md
- User guide: see README.md
