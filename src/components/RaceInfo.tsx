"use client";

import { useState } from "react";
import type { RaceWithResults } from "@/lib/types";
import { RaceCard } from "./RaceCard";
import { RefreshCw, Loader2 } from "lucide-react";

interface RaceInfoProps {
  races: RaceWithResults[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean; // New prop
}

export function RaceInfo({ races, onRefresh, isRefreshing }: RaceInfoProps) {
  const [activeTab, setActiveTab] = useState<"all" | "finished" | "scheduled">(
    "all"
  );

  const filteredRaces = races.filter((race) => {
    if (activeTab === "finished") return race.status === "finished";
    if (activeTab === "scheduled") return race.status === "scheduled";
    return true; // "all"
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Race Calendar & Results</h2>
        <div className="flex space-x-2 text-sm">
          <button
            onClick={() => setActiveTab("all")}
            className={`btn-ghost ${
              activeTab === "all" ? "bg-red-900/20" : ""
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("finished")}
            className={`btn-ghost ${
              activeTab === "finished" ? "bg-red-900/20" : ""
            }`}
          >
            Finished
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`btn-ghost ${
              activeTab === "scheduled" ? "bg-red-900/20" : ""
            }`}
          >
            Scheduled
          </button>
        </div>
      </div>

      {filteredRaces.length === 0 ? (
        <p className="text-center text-muted py-8">
          No races match the selected filter.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredRaces.map((race) => (
            <RaceCard key={race.round} race={race} />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`btn-ghost w-fit ${
            isRefreshing ? "opacity-50" : ""
          }`}
        >
          {isRefreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2" />
              Refresh All Data
            </>
          )}
        </button>
      </div>
    </div>
  );
}