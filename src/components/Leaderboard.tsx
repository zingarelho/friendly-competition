"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/lib/types";
import { Trophy, Medal, TrendingUp } from "lucide-react";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export function Leaderboard({ entries }: LeaderboardProps) {
  const maxPoints = entries.length > 0 ? entries[0].totalPoints : 0;

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-gold/30 bg-gold/5";
      case 2:
        return "border-silver/30 bg-silver/5";
      case 3:
        return "border-bronze/30 bg-bronze/5";
      default:
        return "border-border bg-background-card";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={18} className="text-gold" />;
      case 2:
        return <Medal size={18} className="text-silver" />;
      case 3:
        return <Medal size={18} className="text-bronze" />;
      default:
        return (
          <span className="text-sm font-mono font-bold text-foreground-subtle w-[18px] text-center">
            {rank}
          </span>
        );
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">No standings yet</p>
        <p className="text-sm mt-1">Add users and predictions to see the leaderboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      {entries.map((entry, index) => {
        const rank = index + 1;
        const barWidth = maxPoints > 0 ? (entry.totalPoints / maxPoints) * 100 : 0;

        return (
          <div
            key={entry.userId}
            className={`
              relative border rounded-lg p-4 card-glow transition-all
              ${getRankStyle(rank)}
            `}
          >
            {/* Points bar background */}
            <div
              className="absolute inset-y-0 left-0 bg-accent/5 rounded-lg transition-all duration-500"
              style={{ width: `${barWidth}%` }}
            />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRankIcon(rank)}
                <div>
                  <span className="font-bold text-sm">{entry.username}</span>
                  <div className="text-xs text-foreground-muted mt-0.5">
                    {Object.values(entry.racePoints).filter((p) => p > 0).length} races scored
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-mono font-bold animate-count-up">
                  {entry.totalPoints.toFixed(1)}
                </span>
                <span className="text-xs text-foreground-muted ml-1">pts</span>
              </div>
            </div>

            {/* Mini race breakdown */}
            <div className="flex gap-1 mt-3 flex-wrap">
              {Object.entries(entry.racePoints).map(([round, pts]) => (
                <div
                  key={round}
                  title={`Round ${round}: ${pts.toFixed(1)} pts`}
                  className={`
                    w-5 h-5 rounded text-[10px] font-mono flex items-center justify-center
                    ${pts > 0 ? "bg-accent/20 text-accent" : "bg-border/30 text-foreground-subtle"}
                  `}
                >
                  {parseInt(round)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
