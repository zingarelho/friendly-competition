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
    <div className="relative flex items-center gap-1.5">
      <Calendar size={13} className="text-foreground-muted shrink-0" />
      <div className="relative">
        <select
          value={activeSeason}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="
            appearance-none bg-background-card border border-border rounded-md
            pl-2 pr-6 py-1 text-[11px] sm:text-xs font-semibold
            cursor-pointer focus:outline-none focus:border-accent transition-colors
            text-foreground
          "
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {/* Custom dropdown arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5">
          <svg className="w-3 h-3 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}