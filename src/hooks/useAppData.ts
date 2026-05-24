"use client";

import { useState, useEffect, useCallback } from "react";
import type { RaceWithResults, User, Prediction, LeaderboardEntry } from "@/lib/types";
import { calculatePoints } from "@/lib/scoring";
import { SITE_NAME } from "@/lib/constants";

export function useAppData() {
  const [races, setRaces] = useState<RaceWithResults[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [racesRes, usersRes, predsRes] = await Promise.all([
        fetch("/api/races?action=races"),
        fetch("/api/data?type=users"),
        fetch("/api/data?type=predictions"),
      ]);

      if (racesRes.ok) {
        const { data } = await racesRes.json();
        setRaces(data || []);
      }
      if (usersRes.ok) {
        const { data } = await usersRes.json();
        setUsers(data || []);
      }
      if (predsRes.ok) {
        const { data } = await predsRes.json();
        setPredictions(data || []);
      }
    } catch (err) {
      console.error("[useAppData] Fetch error:", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFromAPI = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/races?action=refresh");
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("[useAppData] Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  const refreshSingleRace = useCallback(async (round: number) => {
    try {
      await fetch(`/api/races?action=results&round=${round}`);
      await fetchData();
    } catch (err) {
      console.error("[useAppData] Single race refresh error:", err);
    }
  }, [fetchData]);

  const addUser = useCallback(async (username: string) => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", username }),
    });
    if (res.ok) {
      await fetchData();
    }
  }, [fetchData]);

  const removeUser = useCallback(async (userId: number) => {
    const res = await fetch(`/api/data?type=user&userId=${userId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchData();
    }
  }, [fetchData]);

  const savePrediction = useCallback(async (
    userId: number, raceName: string, picks: string[], isLate: boolean
  ) => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "prediction", userId, raceName, picks, isLate }),
    });
    if (res.ok) {
      await fetchData();
    }
  }, [fetchData]);

  const removePrediction = useCallback(async (userId: number, raceName: string) => {
    const res = await fetch(
      `/api/data?type=prediction&userId=${userId}&raceName=${encodeURIComponent(raceName)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await fetchData();
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate leaderboard
  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    const scores: Record<number, { username: string; total: number; byRace: Record<number, number> }> = {};

    for (const user of users) {
      scores[user.id] = { username: user.username, total: 0, byRace: {} };
    }

    for (const race of races) {
      for (const user of users) {
        const pred = predictions.find(
          (p) => p.userId === user.id && p.raceName === race.name
        );
        let points = 0;
        if (pred && race.results.length > 0) {
          points = calculatePoints(pred.picks, race.results, pred.isLate, false);
        } else if (!pred && race.results.length > 0) {
          // Carry-forward
          const currentIdx = races.findIndex((r) => r.round === race.round);
          for (let i = currentIdx - 1; i >= 0; i--) {
            const prevRace = races[i];
            const prevPred = predictions.find(
              (p) => p.userId === user.id && p.raceName === prevRace.name
            );
            if (prevPred) {
              points = calculatePoints(prevPred.picks, race.results, false, true);
              break;
            }
          }
        }
        scores[user.id].byRace[race.round] = points;
        scores[user.id].total += points;
      }
    }

    return Object.entries(scores)
      .map(([userId, data]) => ({
        userId: parseInt(userId),
        username: data.username,
        totalPoints: data.total,
        racePoints: data.byRace,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [users, races, predictions]);

  return {
    races,
    users,
    predictions,
    leaderboard,
    isLoading,
    isRefreshing,
    error,
    refreshFromAPI,
    refreshSingleRace,
    addUser,
    removeUser,
    savePrediction,
    removePrediction,
  };
}

// Need useMemo for leaderboard
import { useMemo } from "react";
