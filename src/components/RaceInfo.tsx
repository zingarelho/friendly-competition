"use client";

import { useState } from "react";
import type { RaceWithResults } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { RefreshCw, Loader2 } from "lucide-react";

interface RaceInfoProps {
  races: RaceWithResults[];
  onRefresh: () => void;
  onRefreshSingle: (round: number) => void;
  isRefreshing: boolean;
}

export function RaceInfo({ races, onRefresh, onRefreshSingle, isRefreshing }: RaceInfoProps) {
  const [showOnlyFinished, setShowOnlyFinished] = useState(false);

  const filteredRaces = showOnlyFinished
    ? races.filter((r) => r.status === "finished")
    : races;

  const finishedCount = races.filter((r) => r.status === "finished").length;

  return (
    <div className="animate-fade-in">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Refresh All Data
          </button>
          <span className="text-xs text-foreground-muted">
            {finishedCount} of {races.length} races completed
          </span>
        </div>
        <div className="flex gap-1 bg-background-elevated border border-border rounded-lg p-1">
          <button
            onClick={() => setShowOnlyFinished(false)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
              !showOnlyFinished ? "bg-accent text-white" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setShowOnlyFinished(true)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
              showOnlyFinished ? "bg-accent text-white" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Finished ({finishedCount})
          </button>
        </div>
      </div>

      {/* Race cards */}
      {filteredRaces.map((race) => (
        <div key={race.round} className="relative">
          <RaceCard race={race} compact />
          {race.status === "finished" && (
            <button
              onClick={() => onRefreshSingle(race.round)}
              className="absolute top-3 right-3 text-xs text-foreground-muted hover:text-accent transition-colors"
              title="Refresh this race"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
