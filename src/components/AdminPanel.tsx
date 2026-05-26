"use client";

import { useState } from "react";
import { UserManagement } from "./UserManagement";
import type { User } from "@/lib/types";
import type { Driver } from "@/lib/types";
import { CalendarPlus, Check, X, Loader2, Users, RefreshCcw } from "lucide-react";

interface AdminPanelProps {
  users: User[];
  availableSeasons: number[];
  drivers: Driver[];
  onAddUser: (username: string) => Promise<void>;
  onRemoveUser: (userId: number) => void;
  onCreateSeason: (season: number) => Promise<void>;
  onRefreshDrivers: () => Promise<void>;
}

export function AdminPanel({
  users,
  availableSeasons,
  drivers,
  onAddUser,
  onRemoveUser,
  onCreateSeason,
  onRefreshDrivers,
}: AdminPanelProps) {
  const [newSeason, setNewSeason] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRefreshingDrivers, setIsRefreshingDrivers] = useState(false);

  const nextYear = new Date().getFullYear() + 1;
  const suggestedYear = Math.max(
    nextYear,
    ...availableSeasons,
    new Date().getFullYear()
  );

  const handleCreateSeason = async () => {
    const year = parseInt(newSeason || String(suggestedYear));
    if (isNaN(year) || year < 2000 || year > 2099) {
      setError("Enter a valid year between 2000 and 2099");
      return;
    }
    if (availableSeasons.includes(year)) {
      setError(`Season ${year} already exists`);
      return;
    }
    setIsCreating(true);
    setError("");
    setSuccess("");
    try {
      await onCreateSeason(year);
      setSuccess(`Season ${year} created!`);
      setNewSeason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create season");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefreshDrivers = async () => {
    setIsRefreshingDrivers(true);
    try {
      await onRefreshDrivers();
      setSuccess("Drivers refreshed from Jolpica API!");
    } catch {
      setError("Failed to refresh drivers");
    } finally {
      setIsRefreshingDrivers(false);
    }
  };

  // Group drivers by team
  const teams = new Map<string, Driver[]>();
  drivers.forEach((d) => {
    const list = teams.get(d.team) ?? [];
    list.push(d);
    teams.set(d.team, list);
  });
  const driversByTeam = Array.from(teams.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Create New Season */}
      <div className="bg-background-elevated border border-border rounded-lg p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4 flex items-center gap-2">
          <CalendarPlus size={14} />
          Add New Season
        </h3>
        <div className="flex gap-3">
          <input
            type="number"
            value={newSeason}
            onChange={(e) => {
              setNewSeason(e.target.value);
              setError("");
              setSuccess("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreateSeason()}
            placeholder={String(suggestedYear)}
            min={2000}
            max={2099}
            className="
              flex-1 bg-background-card border border-border rounded-lg px-4 py-2.5 text-sm
              focus:outline-none focus:border-accent transition-colors
              placeholder:text-foreground-subtle
            "
          />
          <button
            onClick={handleCreateSeason}
            disabled={isCreating}
            className="
              px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg
              hover:bg-accent-hover transition-colors flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isCreating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Create
          </button>
        </div>
        {error && (
          <p className="text-xs text-danger mt-2 flex items-center gap-1">
            <X size={12} />
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
            <Check size={12} />
            {success}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-foreground-muted">
          <span>Existing seasons:</span>
          {availableSeasons.length === 0 ? (
            <span className="italic">None yet</span>
          ) : (
            availableSeasons.sort().map((s, i) => (
              <span key={s}>
                <span className="font-semibold text-foreground">{s}</span>
                {i < availableSeasons.length - 1 && (
                  <span className="mx-1">•</span>
                )}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Driver List */}
      <div className="bg-background-elevated border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted flex items-center gap-2">
            <Users size={14} />
            Drivers ({drivers.length})
          </h3>
          <button
            onClick={handleRefreshDrivers}
            disabled={isRefreshingDrivers}
            className="
              px-3 py-1.5 text-xs font-semibold rounded-lg
              bg-background-card border border-border
              hover:border-accent text-foreground-muted hover:text-foreground
              transition-colors flex items-center gap-1.5
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isRefreshingDrivers ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCcw size={12} />
            )}
            Refresh
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {driversByTeam.map(([team, teamDrivers]) => (
            <div key={team}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle mb-1">
                {team}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {teamDrivers.map((d) => (
                  <span
                    key={d.code}
                    className="
                      inline-flex items-center gap-1.5 px-2 py-0.5
                      text-xs font-mono font-bold rounded
                      bg-background-card border border-border/50
                    "
                    style={{ borderLeftColor: d.color, borderLeftWidth: "3px", borderLeftStyle: "solid" }}
                    title={d.name}
                  >
                    {d.code}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {drivers.length === 0 && (
            <p className="text-xs text-foreground-subtle italic">
              No drivers loaded. Click Refresh to fetch from Jolpica API.
            </p>
          )}
        </div>
      </div>

      {/* User Management */}
      <UserManagement
        users={users}
        onAddUser={onAddUser}
        onRemoveUser={onRemoveUser}
      />
    </div>
  );
}