# Multi-Year & Mobile UX Improvements — Implementation Plan

## Overview
Four changes: (1) consolidate Users tab into Admin with season creation, (2) dropdown season switcher, (3) show app title on mobile, (4) icons-only tabs on mobile to eliminate horizontal scroll.

---

## 1. Tab: Users → Admin

### What changes
- Rename the "Users" tab to "Admin" in `page.tsx` (`TABS` array)
- Change the icon from `Users` to `Settings` (cog icon)
- Keep the existing `UserManagement` component content
- Add a **"Create New Season"** section at the top of the Admin panel

### New Season Creation UI
```
┌──────────────────────────────────────────┐
│ ⚙️ Admin                                │
├──────────────────────────────────────────┤
│ Add New Season                           │
│ ┌──────────────────────┐ ┌──────────┐   │
│ │ 2028                 │ │ Create   │   │
│ └──────────────────────┘ └──────────┘   │
│                                           │
│ 📋 Existing Seasons: 2026 • 2027 • 2028  │
├──────────────────────────────────────────┤
│ 👥 Add New User                         │
│ ... (current user management form)       │
└──────────────────────────────────────────┘
```

### New API endpoint needed
A new action in `races/route.ts` for season creation:

```typescript
case "create-season": {
  const newSeason = parseInt(searchParams.get("season") || "0");
  if (newSeason < 2026 || newSeason > 2099) {
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  }
  // Seed the fallback calendar for this season into the DB
  await seedFallbackCalendar(newSeason);
  return NextResponse.json({ success: true, season: newSeason });
}
```

The `seedFallbackCalendar` function already exists in both `db-sqlite.ts` and `db-turso.ts` — it checks if races exist for that season, and if not, inserts from `FALLBACK_CALENDAR[season]`.

### Dynamic season list
Currently `AVAILABLE_SEASONS` is hardcoded in `page.tsx`:
```typescript
const AVAILABLE_SEASONS = [2026, 2027];
```

Change to fetch from the API. The `"seasons"` action already exists in `races/route.ts` — it queries the DB for seasons that have data. Fetch it on page load and pass to components.

**Files to change:**
| File | Change |
|------|--------|
| `src/app/page.tsx` | Rename tab, fetch seasons from API, pass to Admin component |
| `src/components/AdminPanel.tsx` | **New file** — wraps UserManagement + season creation |
| `src/app/api/races/route.ts` | Add `"create-season"` case |
| `src/hooks/useAppData.ts` | Add `createSeason(season: number)` callback + fetch seasons |

---

## 2. Season Switcher: Buttons → Dropdown

### What changes
Replace the current button group in `SeasonSwitcher.tsx`:

```
Current:  [2026] [2027]
Proposed:  📅  2026 ▼  (dropdown with 2026, 2027, 2028...)
```

### Implementation
```tsx
export function SeasonSwitcher({ activeSeason, seasons, onChange }: SeasonSwitcherProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Calendar size={12} className="text-foreground-muted shrink-0" />
      <select
        value={activeSeason}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="bg-background-card border border-border rounded px-2 py-1 text-xs font-semibold
                   appearance-none cursor-pointer focus:outline-none focus:border-accent"
      >
        {seasons.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
```

Much more compact — takes the space of a single button regardless of how many seasons exist.

**Files to change:**
| File | Change |
|------|--------|
| `src/components/SeasonSwitcher.tsx` | Replace button group with `<select>` dropdown |

---

## 3. Mobile Header: Show App Title

### Current state
In `page.tsx`, the app title "Friendly Competition" is hidden on mobile:
```tsx
<span className="hidden sm:inline">Fantasy F1 League</span>
```
And the bold text shows only the year number:
```tsx
<span className="font-bold text-xs sm:text-sm uppercase tracking-widest truncate">
  {activeSeason}
</span>
```

### What changes
Swap the visibility classes so the app name is always visible and the season/year is the secondary detail:

```tsx
<span className="font-bold text-xs sm:text-sm uppercase tracking-widest truncate">
  Friendly Competition
</span>
<span className="text-foreground-subtle text-[10px] sm:text-xs">
  {activeSeason} Season
</span>
```

This means:
- **Mobile**: Shows "Friendly Competition" (always visible) + year in smaller text
- **Desktop**: Shows "Friendly Competition" + "2026 Season" side by side

**File to change:**
| File | Change |
|------|--------|
| `src/app/page.tsx` | Swap header text visibility, always show app name |

---

## 4. Mobile Tabs: Icons-Only

### Current problem
5 tabs (Leaderboard, Predictions, Submit, Races, Admin) need horizontal scrolling on mobile because labels + icons don't fit.

### What changes
In `TabSwitcher.tsx`, hide the label text on mobile using Tailwind responsive classes:

```tsx
<button className="...">
  <span className="flex items-center gap-1.5 sm:gap-2">
    {tab.icon}
    <span className="hidden sm:inline">{tab.label}</span>  {/* ← hide on mobile */}
  </span>
  {/* active indicator */}
</button>
```

On mobile, each tab shows only the icon. On `sm:` breakpoint and up, labels appear.

**Result on mobile (320px–640px):**
```
| 🏆 | 📋 | ✉️ | 🏁 | ⚙️ |
```
All 5 fit without scrolling. Icons are all distinct and recognizable.

**File to change:**
| File | Change |
|------|--------|
| `src/components/TabSwitcher.tsx` | Add `hidden sm:inline` to label span |

---

## Implementation Order

### Phase 1: Tab restructure + Admin panel (highest impact)
1. Create `src/components/AdminPanel.tsx` — merge user management + season creator
2. Add `"create-season"` action to `races/route.ts`
3. Update `page.tsx` — rename tab, pass season props
4. Update `useAppData.ts` — add `createSeason` + dynamic seasons fetch

### Phase 2: Season switcher dropdown
5. Rewrite `SeasonSwitcher.tsx` — replace buttons with `<select>`
6. Wire up dynamic seasons list from API

### Phase 3: Visual polish
7. `TabSwitcher.tsx` — hide labels on mobile
8. `page.tsx` — fix header title visibility on mobile

---

## Files Summary

| Action | File |
|--------|------|
| **Create** | `src/components/AdminPanel.tsx` |
| **Modify** | `src/app/page.tsx` — tab config, header, season list |
| **Modify** | `src/components/TabSwitcher.tsx` — icons-only on mobile |
| **Modify** | `src/components/SeasonSwitcher.tsx` — dropdown instead of buttons |
| **Modify** | `src/app/api/races/route.ts` — create-season endpoint |
| **Modify** | `src/hooks/useAppData.ts` — createSeason + dynamic seasons |
