"use client";

import { useState } from "react";
import { useAppData } from "@/hooks/useAppData";
import { TabSwitcher } from "@/components/TabSwitcher";
import { Leaderboard } from "@/components/Leaderboard";
import { PredictionsView } from "@/components/PredictionsView";
import { RaceInfo } from "@/components/RaceInfo";
import { PredictionForm } from "@/components/PredictionForm";
import { AdminPanel } from "@/components/AdminPanel";
import { SeasonSwitcher } from "@/components/SeasonSwitcher";
import { CURRENT_SEASON } from "@/lib/constants";
import {
  Trophy,
  ClipboardList,
  Flag,
  Settings,
  Send,
  Loader2,
  Zap,
  RefreshCcw,
} from "lucide-react";

const TABS = [
  { key: "leaderboard", label: "Leaderboard", icon: <Trophy size={18} /> },
  { key: "predictions", label: "Predictions", icon: <ClipboardList size={18} /> },
  { key: "submit", label: "Submit", icon: <Send size={18} /> },
  { key: "raceinfo", label: "Races", icon: <Flag size={18} /> },
  { key: "users", label: "Admin", icon: <Settings size={18} /> },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("leaderboard");
  const {
    races,
    users,
    predictions,
    leaderboard,
    isLoading,
    isRefreshing,
    activeSeason,
    availableSeasons,
    drivers,
    switchSeason,
    createSeason,
    refreshDrivers,
    refreshFromAPI,
    refreshSingleRace,
    addUser,
    removeUser,
    savePrediction,
    removePrediction,
  } = useAppData(CURRENT_SEASON);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground-muted text-sm">Loading {activeSeason} Season...</p>
        </div>
      </div>
    );
  }

  const finishedRaces = races.filter((r) => r.status === "finished").length;
  const totalRaces = races.length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
<header className="border-b border-border bg-background-elevated/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-11 sm:h-14 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <Zap size={18} className="text-accent" />
                <span className="font-bold text-xs sm:text-sm uppercase tracking-widest truncate">
                  Friendly Competition
                </span>
              </div>
              <span className="text-foreground-subtle text-[10px] sm:text-xs hidden sm:inline">
                {activeSeason} Season
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <span className="text-foreground-muted text-[10px] sm:text-xs hidden sm:inline">
                {finishedRaces}/{totalRaces} races
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation + Season Switcher */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-11 sm:top-14 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-end justify-between">
          <TabSwitcher
            tabs={TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <div className="flex items-center gap-2 pb-2 sm:pb-3 shrink-0">
            <span className="text-foreground-muted text-[10px] sm:text-xs sm:hidden">
              {finishedRaces}/{totalRaces}
            </span>
            <SeasonSwitcher
              activeSeason={activeSeason}
              seasons={availableSeasons}
              onChange={switchSeason}
            />
          </div>
        </div>
      </div>
      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 w-full">
        {activeTab === "leaderboard" && (
          <Leaderboard entries={leaderboard} season={activeSeason} />
        )}

        {activeTab === "predictions" && (
          <PredictionsView
            races={races}
            users={users}
            predictions={predictions}
            season={activeSeason}
            onRemovePrediction={removePrediction}
          />
        )}

        {activeTab === "submit" && (
          <PredictionForm
            races={races}
            users={users}
            season={activeSeason}
            drivers={drivers}
            onSave={savePrediction}
            onRemove={removePrediction}
          />
        )}

        {activeTab === "raceinfo" && (
          <RaceInfo
            races={races}
            season={activeSeason}
            onRefresh={refreshFromAPI}
            onRefreshSingle={refreshSingleRace}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === "users" && (
          <AdminPanel
            users={users}
            availableSeasons={availableSeasons}
            drivers={drivers}
            onAddUser={addUser}
            onRemoveUser={removeUser}
            onCreateSeason={createSeason}
            onRefreshDrivers={refreshDrivers}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-foreground-subtle">
        <p>{activeSeason} Season — Powered by Jolpica API • Built with Next.js</p>
      </footer>
    </div>
  );
}