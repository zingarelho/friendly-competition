"use client";

import { useState, useMemo } from "react";
import type { RaceWithResults, User } from "@/lib/types";
import type { Driver } from "@/lib/types";
import { DRIVERS_BY_SEASON } from "@/lib/constants";
import { Send, Trash2, Check, AlertTriangle } from "lucide-react";

interface PredictionFormProps {
  races: RaceWithResults[];
  users: User[];
  season: number;
  onSave: (userId: number, raceName: string, picks: string[], isLate: boolean) => void;
  onRemove: (userId: number, season: number, raceName: string) => void;
}

export function PredictionForm({ races, users, season, onSave, onRemove }: PredictionFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedRace, setSelectedRace] = useState<string>("");
  const [picks, setPicks] = useState<string[]>(["", "", "", "", ""]);
  const [isLate, setIsLate] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const drivers = DRIVERS_BY_SEASON[season] ?? [];

  // Group drivers by team and sort alphabetically
  const driversByTeam = useMemo(() => {
    const teams = new Map<string, Driver[]>();
    drivers.forEach((d) => {
      const list = teams.get(d.team) ?? [];
      list.push(d);
      teams.set(d.team, list);
    });
    return Array.from(teams.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [drivers]);

  const availableRaces = races;

  const handlePickChange = (index: number, code: string) => {
    const upper = code.toUpperCase();
    const newPicks = [...picks];
    newPicks[index] = upper;
    setPicks(newPicks);
    setStatus(null);
  };

  const isValidPick = (code: string) => {
    if (code.length !== 3) return false;
    return drivers.some((d) => d.code === code.toUpperCase());
  };

  const hasDuplicates = () => {
    const filled = picks.filter((p) => p.length === 3);
    return new Set(filled).size !== filled.length;
  };

  const allPicksValid = () => {
    return picks.every((p) => isValidPick(p)) && !hasDuplicates();
  };

  const handleSubmit = async () => {
    if (!selectedUserId || !selectedRace) {
      setStatus({ type: "error", message: "Please select a user and race" });
      return;
    }
    if (!allPicksValid()) {
      setStatus({ type: "error", message: "All 5 picks must be valid, unique driver codes" });
      return;
    }
    try {
      await onSave(selectedUserId, selectedRace, picks.map((p) => p.toUpperCase()), isLate);
      setStatus({ type: "success", message: "Prediction saved!" });
      setPicks(["", "", "", "", ""]);
      setIsLate(false);
    } catch {
      setStatus({ type: "error", message: "Failed to save prediction" });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleDelete = async () => {
    if (!selectedUserId || !selectedRace) return;
    try {
      await onRemove(selectedUserId, season, selectedRace);
      setStatus({ type: "success", message: "Prediction removed" });
    } catch {
      setStatus({ type: "error", message: "Failed to remove prediction" });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const selectedUserData = users.find((u) => u.id === selectedUserId);

  return (
    <div className="animate-fade-in">
      <div className="bg-background-elevated border border-border rounded-lg p-5 mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-5 flex items-center gap-2">
          <Send size={14} />
          Submit Prediction
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* User selector */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">User</label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(Number(e.target.value));
                setStatus(null);
              }}
              className="w-full bg-background-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              <option value={0}>Select user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>

          {/* Race selector */}
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">Race</label>
            <select
              value={selectedRace}
              onChange={(e) => {
                setSelectedRace(e.target.value);
                setStatus(null);
              }}
              className="w-full bg-background-card border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
            >
              <option value="">Select race...</option>
              {availableRaces.map((r) => (
                <option key={r.round} value={r.name}>
                  {r.status === "finished" ? "🏁" : "📅"} Round {r.round} — {r.name} ({r.date})
                </option>
              ))}
            </select>
            {availableRaces.length === 0 && (
              <p className="text-xs text-foreground-subtle mt-1">No races available for this season</p>
            )}
          </div>
        </div>

        {/* Driver picks */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-foreground-muted mb-3">
            Top 5 Picks (in order)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {picks.map((pick, i) => (
              <div key={i}>
                <label className="block text-[10px] font-mono text-foreground-subtle mb-1 text-center">
                  P{i + 1}
                </label>
                <input
                  type="text"
                  value={pick}
                  onChange={(e) => handlePickChange(i, e.target.value)}
                  placeholder="___"
                  maxLength={3}
                  className={`
                    w-full text-center font-mono font-bold text-sm uppercase bg-background-card border rounded-lg px-2 py-2.5
                    focus:outline-none transition-colors placeholder:text-foreground-subtle
                    ${pick.length === 3
                      ? isValidPick(pick)
                        ? "border-success/50 text-success"
                        : "border-danger/50 text-danger"
                      : "border-border focus:border-accent"
                    }
                  `}
                />
              </div>
            ))}
          </div>
          {hasDuplicates() && (
            <p className="text-xs text-danger mt-2 flex items-center gap-1">
              <AlertTriangle size={12} />
              Duplicate driver codes detected
            </p>
          )}
        </div>

        {/* Driver quick-select by team */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-foreground-muted mb-3">
            Quick Select Drivers
          </label>
          <div className="space-y-3">
            {driversByTeam.map(([team, teamDrivers]) => (
              <div key={team}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle mb-1.5 px-1">
                  {team}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {teamDrivers.map((d) => {
                    const isUsed = picks.includes(d.code);
                    return (
                      <button
                        key={d.code}
                        onClick={() => {
                          const emptyIdx = picks.findIndex((p) => p.length !== 3);
                          if (emptyIdx >= 0 && !isUsed) {
                            handlePickChange(emptyIdx, d.code);
                          }
                        }}
                        disabled={isUsed}
                        className={`
                          px-3 py-1.5 text-sm font-mono font-bold rounded-md transition-colors
                          ${isUsed
                            ? "bg-accent/20 text-accent opacity-40 cursor-not-allowed"
                            : "bg-background-card border border-border hover:border-accent text-foreground-muted hover:text-foreground"
                          }
                        `}
                        style={{ borderLeftColor: d.color, borderLeftWidth: "3px", borderLeftStyle: "solid" }}
                        title={`${d.name} (${d.team})`}
                      >
                        {d.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Late checkbox */}
        <label className="flex items-center gap-2 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={isLate}
            onChange={(e) => setIsLate(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-background-card accent-accent"
          />
          <span className="text-sm text-foreground-muted">Submitted after qualifying (50% penalty)</span>
        </label>{/* Status message */}
        {status && (
          <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg mb-4 ${
            status.type === "success"
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
          }`}>
            {status.type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
            {status.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedUserId || !selectedRace || !allPicksValid()}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            Save Prediction
          </button>
          {selectedUserData && selectedRace && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2.5 text-danger text-sm font-medium rounded-lg hover:bg-danger/10 transition-colors border border-danger/30"
            >
              <Trash2 size={14} />
              Delete for this race
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
