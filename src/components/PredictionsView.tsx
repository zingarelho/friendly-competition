"use client";

import { useState, useMemo } from "react";
import type { RaceWithResults, User, Prediction, ScoredPrediction } from "@/lib/types";
import { calculateDriverBreakdown, calculatePoints } from "@/lib/scoring";
import { RaceCard } from "./RaceCard";
import { ChevronDown } from "lucide-react";

interface PredictionsViewProps {
  races: RaceWithResults[];
  users: User[];
  predictions: Prediction[];
  onRemovePrediction: (userId: number, raceName: string) => void;
}

export function PredictionsView({
  races,
  users,
  predictions,
  onRemovePrediction,
}: PredictionsViewProps) {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "finished" | "scheduled">("all");

  const user = users.find((u) => u.username === selectedUser);

  // Build prediction lookup and calculate scores
  const raceCards = useMemo(() => {
    if (!user) return [];

    return races
      .filter((race) => {
        if (filter === "finished") return race.status === "finished";
        if (filter === "scheduled") return race.status === "scheduled";
        return true;
      })
      .map((race) => {
        const pred = predictions.find(
          (p) => p.userId === user.id && p.raceName === race.name
        );

        let scored: ScoredPrediction | undefined;
        let isCarryForward = false;
        let carriedFrom: string | undefined;

        if (pred && race.results.length > 0) {
          scored = calculateDriverBreakdown(
            pred.picks,
            race.results,
            pred.isLate,
            false
          );
        } else if (!pred && race.results.length > 0) {
          // Find last valid picks for carry-forward
          const currentIdx = races.findIndex((r) => r.round === race.round);
          for (let i = currentIdx - 1; i >= 0; i--) {
            const prevRace = races[i];
            const prevPred = predictions.find(
              (p) => p.userId === user.id && p.raceName === prevRace.name
            );
            if (prevPred) {
              scored = calculateDriverBreakdown(
                prevPred.picks,
                race.results,
                false,
                true
              );
              isCarryForward = true;
              carriedFrom = prevRace.name;
              break;
            }
          }
        }

        return { race, prediction: pred, scored, isCarryForward, carriedFrom };
      });
  }, [races, predictions, user, filter]);

  const totalPoints = raceCards.reduce((sum, rc) => sum + (rc.scored?.finalTotal ?? 0), 0);

  return (
    <div className="animate-fade-in">
      {/* User selector and filter */}
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
            Select User
          </label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full bg-background-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
          >
            <option value="">Choose a user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.username}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-foreground-muted mb-2">
            Filter
          </label>
          <div className="flex gap-1 bg-background-elevated border border-border rounded-lg p-1">
            {(["all", "finished", "scheduled"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors
                  ${filter === f
                    ? "bg-accent text-white"
                    : "text-foreground-muted hover:text-foreground"
                  }
                `}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {user && (
          <div className="text-right">
            <div className="text-xs text-foreground-muted uppercase tracking-wider">Total</div>
            <div className="text-2xl font-mono font-bold text-accent">{totalPoints.toFixed(1)}</div>
          </div>
        )}
      </div>

      {/* Race cards */}
      {user ? (
        raceCards.length > 0 ? (
          raceCards.map((rc) => (
            <RaceCard
              key={rc.race.round}
              race={rc.race}
              prediction={rc.prediction}
              scored={rc.scored}
              isCarryForward={rc.isCarryForward}
            />
          ))
        ) : (
          <p className="text-foreground-muted text-center py-8">No races match the filter</p>
        )
      ) : (
        <div className="text-center py-12 text-foreground-muted">
          <ChevronDown size={32} className="mx-auto mb-3 opacity-30 animate-bounce" />
          <p>Select a user to view their predictions</p>
        </div>
      )}
    </div>
  );
}
