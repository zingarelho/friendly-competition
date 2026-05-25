"use client";

import { Calendar } from "lucide-react";

interface SeasonSwitcherProps {
  activeSeason: number;
  seasons: number[];
  onChange: (season: number) => void;
}

export function SeasonSwitcher({ activeSeason, seasons, onChange }: SeasonSwitcherProps) {
  if (seasons.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Calendar size={12} className="text-foreground-muted shrink-0" />
      <select
        value={activeSeason}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="
          bg-background-card border border-border rounded px-2 py-1 text-[11px] sm:text-xs font-semibold
          appearance-none cursor-pointer focus:outline-none focus:border-accent transition-colors
          text-foreground
        "
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s} Season
          </option>
        ))}
      </select>
    </div>
  );
}