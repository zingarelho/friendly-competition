"use client";

import { useState } from "react";
import { useAppData } from "@/hooks/useAppData";
import { TabSwitcher } from "@/components/TabSwitcher";
import { Leaderboard } from "@/components/Leaderboard";
import { PredictionsView } from "@/components/PredictionsView";
import { RaceInfo } from "@/components/RaceInfo";
import { UserManagement } from "@/components/UserManagement";
import { PredictionForm } from "@/components/PredictionForm";
import { SITE_NAME } from "@/lib/constants";
import {
  Trophy,
  ClipboardList,
  Flag,
  Users,
  Send,
  Loader2,
  Zap,
} from "lucide-react";

const TABS = [
  { key: "leaderboard", label: "Leaderboard", icon: <Trophy size={14} /> },
  { key: "predictions", label: "Predictions", icon: <ClipboardList size={14} /> },
  { key: "submit", label: "Submit", icon: <Send size={14} /> },
  { key: "raceinfo", label: "Race Info", icon: <Flag size={14} /> },
  { key: "users", label: "Users", icon: <Users size={14} /> },
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
    refreshFromAPI,
    refreshSingleRace,
    addUser,
    removeUser,
    savePrediction,
    removePrediction,
  } = useAppData();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground-muted text-sm">Loading {SITE_NAME}...</p>
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
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Zap size={16} className="text-accent sm:size-[20px]" />
                <span className="font-bold text-xs sm:text-sm uppercase tracking-widest truncate">
                  {SITE_NAME}
                </span>
              </div>
              <span className="text-foreground-subtle text-[10px] sm:text-xs hidden sm:inline">
                Fantasy F1 League
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-foreground-muted shrink-0">
              <span className="inline sm:hidden">
                {finishedRaces}/{totalRaces}
              </span>
              <span className="hidden sm:inline">
                {finishedRaces}/{totalRaces} races
              </span>
              <span className="hidden sm:inline">
                {users.length} users
              </span>
              <span className="hidden sm:inline">
                {predictions.length} predictions
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-14 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
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
          <Leaderboard entries={leaderboard} />
        )}

        {activeTab === "predictions" && (
          <PredictionsView
            races={races}
            users={users}
            predictions={predictions}
            onRemovePrediction={removePrediction}
          />
        )}

        {activeTab === "submit" && (
          <PredictionForm
            races={races}
            users={users}
            onSave={savePrediction}
            onRemove={removePrediction}
          />
        )}

        {activeTab === "raceinfo" && (
          <RaceInfo
            races={races}
            onRefresh={refreshFromAPI}
            onRefreshSingle={refreshSingleRace}
            isRefreshing={isRefreshing}
          />
        )}

        {activeTab === "users" && (
          <UserManagement
            users={users}
            onAddUser={addUser}
            onRemoveUser={removeUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-foreground-subtle">
        <p>{SITE_NAME} — Powered by Jolpica API • Built with Next.js</p>
      </footer>
    </div>
  );
}
