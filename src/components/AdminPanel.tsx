"use client";

import { useState } from "react";
import { UserManagement } from "./UserManagement";
import type { User } from "@/lib/types";
import { CalendarPlus, Check, X, Loader2 } from "lucide-react";

interface AdminPanelProps {
  users: User[];
  availableSeasons: number[];
  onAddUser: (username: string) => Promise<void>;
  onRemoveUser: (userId: number) => void;
  onCreateSeason: (season: number) => Promise<void>;
}

export function AdminPanel({
  users,
  availableSeasons,
  onAddUser,
  onRemoveUser,
  onCreateSeason,
}: AdminPanelProps) {
  const [newSeason, setNewSeason] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const nextYear = new Date().getFullYear() + 1;
  const suggestedYear = Math.max(
    nextYear,
    ...availableSeasons,
    new Date().getFullYear()
  );

  const handleCreateSeason = async () => {
    const year = parseInt(newSeason || String(suggestedYear));
    if (isNaN(year) || year < 2026 || year > 2099) {
      setError("Enter a valid year between 2026 and 2099");
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
            min={2026}
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

      {/* User Management */}
      <UserManagement
        users={users}
        onAddUser={onAddUser}
        onRemoveUser={onRemoveUser}
      />
    </div>
  );
}