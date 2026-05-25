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
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Calendar size={12} className="text-foreground-muted shrink-0" />
      <div className="flex gap-0.5 sm:gap-1">
        {seasons.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`
              px-2 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded transition-colors
              ${s === activeSeason
                ? "bg-accent text-white"
                : "bg-background-card text-foreground-muted hover:text-foreground border border-border"
              }
            `}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}