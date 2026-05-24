"use client";

import type { RaceWithResults, Prediction, ScoredPrediction } from "@/lib/types";
import { calculateDriverBreakdown } from "@/lib/scoring";
import { Trophy, Clock, MapPin, ChevronRight } from "lucide-react";

interface RaceCardProps {
  race: RaceWithResults;
  prediction?: Prediction;
  scored?: ScoredPrediction;
  isCarryForward?: boolean;
  compact?: boolean;
}

export function RaceCard({ race, prediction, scored, isCarryForward, compact }: RaceCardProps) {
  const hasResults = race.status === "finished";
  const hasPrediction = !!prediction;

  return (
    <div className={`
      border border-border rounded-lg overflow-hidden card-glow animate-fade-in
      ${compact ? "mb-2" : "mb-4"}
    `}>
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-background-elevated border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold text-accent w-8 text-center">
            {race.round}
          </span>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide">{race.name}</h3>
            <div className="flex items-center gap-2 text-xs text-foreground-muted mt-0.5">
              <MapPin size={10} />
              <span>{race.date}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasResults ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
              Finished
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              <Clock size={12} />
              Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 bg-background-card">
        {/* Results Table */}
        {hasResults && race.results.length > 0 && !prediction && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-foreground-subtle text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-3 font-medium">Pos</th>
                <th className="text-left py-2 px-3 font-medium">Driver</th>
                <th className="text-right py-2 px-3 font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {race.results.map((r, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-2 px-3 font-mono font-bold text-accent">P{i + 1}</td>
                  <td className="py-2 px-3 font-bold">{r.id}</td>
                  <td className="py-2 px-3 text-right font-mono">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Prediction Breakdown */}
        {hasPrediction && scored && hasResults && (
          <div>
            {isCarryForward && (
              <div className="flex items-center gap-2 text-xs text-warning mb-3 bg-warning/10 px-3 py-2 rounded">
                <ChevronRight size={12} />
                <span>Carried forward from a prior race</span>
              </div>
            )}
            {prediction.isLate && (
              <div className="flex items-center gap-2 text-xs text-danger mb-3 bg-danger/10 px-3 py-2 rounded">
                <Clock size={12} />
                <span>Late prediction (−50% penalty applied)</span>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-foreground-subtle text-xs uppercase tracking-wider">
                  <th className="text-left py-2 px-3 font-medium">Slot</th>
                  <th className="text-left py-2 px-3 font-medium">Driver</th>
                  <th className="text-right py-2 px-3 font-medium">Pts</th>
                  <th className="text-left py-2 px-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {scored.breakdown.map((b) => (
                  <tr key={b.pos} className="border-t border-border/50">
                    <td className="py-2 px-3 font-mono font-bold text-accent">P{b.pos}</td>
                    <td className="py-2 px-3 font-bold">{b.driver}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      <span className={b.earned > 0 ? "text-success" : "text-foreground-subtle"}>
                        {b.earned.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {b.detail.startsWith("Correct") ? (
                        <span className="text-success font-medium">✓ {b.detail}</span>
                      ) : b.detail.startsWith("In top 5") ? (
                        <span className="text-warning font-medium">◐ {b.detail}</span>
                      ) : (
                        <span className="text-foreground-subtle">✗ {b.detail}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
              {scored.subtotal !== scored.finalTotal && (
                <span className="text-xs text-foreground-muted">
                  Subtotal: {scored.subtotal.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-2 text-sm font-bold">
                <Trophy size={14} className="text-gold" />
                {scored.finalTotal.toFixed(1)} pts
              </span>
            </div>
          </div>
        )}

        {/* Predicted but no results yet */}
        {hasPrediction && !hasResults && (
          <div className="text-sm text-foreground-muted">
            Picks: <span className="font-bold text-foreground">{prediction.picks.join(", ")}</span>
            <span className="block text-xs mt-1 opacity-60">Awaiting race results</span>
            {prediction.isLate && (
              <span className="block text-xs mt-1 text-warning">⏰ Submitted late</span>
            )}
          </div>
        )}

        {/* No prediction */}
        {!hasPrediction && !hasResults && (
          <p className="text-sm text-foreground-subtle">No prediction submitted</p>
        )}

        {/* Results available but no prediction */}
        {!hasPrediction && hasResults && (
          <p className="text-sm text-foreground-subtle">No prediction for this race</p>
        )}
      </div>
    </div>
  );
}
