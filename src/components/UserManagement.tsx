"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import { F1_2026_DRIVERS } from "@/lib/constants";
import { UserPlus, Trash2, Users, Check, X } from "lucide-react";

interface UserManagementProps {
  users: User[];
  onAddUser: (username: string) => void;
  onRemoveUser: (userId: number) => void;
}

export function UserManagement({ users, onAddUser, onRemoveUser }: UserManagementProps) {
  const [newUsername, setNewUsername] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    const trimmed = newUsername.trim();
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === trimmed.toLowerCase())) {
      setError("Username already exists");
      return;
    }
    if (trimmed.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }
    try {
      await onAddUser(trimmed);
      setNewUsername("");
      setError("");
    } catch {
      setError("Failed to add user. Check database connection.");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Add user form */}
      <div className="bg-background-elevated border border-border rounded-lg p-5 mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground-muted mb-4 flex items-center gap-2">
          <UserPlus size={14} />
          Add New User
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => {
              setNewUsername(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Enter username..."
            maxLength={20}
            className="flex-1 bg-background-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-foreground-subtle"
          />
          <button
            onClick={handleAdd}
            className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
          >
            <Check size={14} />
            Add
          </button>
        </div>
        {error && (
          <p className="text-xs text-danger mt-2">{error}</p>
        )}
      </div>

      {/* User list */}
      <div className="bg-background-elevated border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Users size={14} className="text-foreground-muted" />
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Registered Users ({users.length})
          </span>
        </div>
        {users.length === 0 ? (
          <div className="text-center py-8 text-foreground-subtle text-sm">
            No users registered yet. Add one above!
          </div>
        ) : (
          <div>
            {users.map((user, index) => (
              <div
                key={user.id}
                className={`flex items-center justify-between px-5 py-3 ${
                  index < users.length - 1 ? "border-b border-border/50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{user.username}</span>
                </div>
                {confirmDelete === user.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-danger">Delete?</span>
                    <button
                      onClick={() => {
                        onRemoveUser(user.id);
                        setConfirmDelete(null);
                      }}
                      className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="p-1.5 text-foreground-muted hover:bg-border/30 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(user.id)}
                    className="p-1.5 text-foreground-subtle hover:text-danger hover:bg-danger/10 rounded transition-colors"
                    title="Remove user"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver reference */}
      <div className="mt-6 bg-background-elevated border border-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <span className="text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            2026 Driver Codes Reference
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-0">
          {F1_2026_DRIVERS.map((d, i) => (
            <div
              key={d.code}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                i < F1_2026_DRIVERS.length - 1 ? "border-b border-border/30" : ""
              }`}
            >
              <div
                className="w-1 h-6 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="font-mono font-bold text-accent text-sm w-10">{d.code}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{d.name}</div>
                <div className="text-[10px] text-foreground-subtle truncate">{d.team}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
