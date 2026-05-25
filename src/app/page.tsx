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
} from "lucide-react";

const TABS = [
  { key: "leaderboard", label: "Leaderboard", icon: <Trophy size={14} /> },
  { key: "predictions", label: "Predictions", icon: <ClipboardList size={14} /> },
  { key: "submit", label: "Submit", icon: <Send size={14} /> },
  { key: "raceinfo", label: "Races", icon: <Flag size={14} /> },
  { key: "users", label: "Admin", icon: <Settings size={14} /> },
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
    switchSeason,
    createSeason,
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
          <div className="flex items-center justify-between h-12 sm:h-14 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Zap size={16} className="text-accent sm:size-[20px]" />
                <span className="font-bold text-xs sm:text-sm uppercase tracking-widest truncate">
                  Friendly Competition
                </span>
              </div>
              <span className="text-foreground-subtle text-[10px] sm:text-xs">
                {activeSeason} Season
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <SeasonSwitcher
                activeSeason={activeSeason}
                seasons={availableSeasons}
                onChange={switchSeason}
              />
              <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-foreground-muted">
                <span className="hidden sm:inline">
                  {finishedRaces}/{totalRaces} races
                </span>
                <span className="hidden sm:inline">
                  {users.length} users
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-12 sm:top-14 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <TabSwitcher
            tabs={TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
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
            onAddUser={addUser}
            onRemoveUser={removeUser}
            onCreateSeason={createSeason}
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