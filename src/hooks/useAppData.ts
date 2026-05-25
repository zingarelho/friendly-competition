"use client";

import { useState, useEffect, useCallback } from "react";
import type { RaceWithResults, User, Prediction, LeaderboardEntry, Driver } from "@/lib/types";
import { calculatePoints } from "@/lib/scoring";
import { CURRENT_SEASON } from "@/lib/constants";

interface AppData {
  races: RaceWithResults[];
  users: User[];
  predictions: Prediction[];
  leaderboard: LeaderboardEntry[];
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
}

export function useAppData(initialSeason: number = CURRENT_SEASON) {
  const [activeSeason, setActiveSeason] = useState(initialSeason);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([2026]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [data, setData] = useState<AppData>({
    races: [],
    users: [],
    predictions: [],
    leaderboard: [],
    error: null,
    isLoading: true,
    isRefreshing: false,
  });

  const loadSeasonData = useCallback(async (season: number) => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const [racesRes, usersRes, predictionsRes] = await Promise.all([
        fetch(`/api/races?action=races&season=${season}`).then(r => r.json()),
        fetch("/api/data?type=users").then(r => r.json()),
        fetch(`/api/data?type=predictions&season=${season}`).then(r => r.json()),
      ]);

      const races = (racesRes as { data: RaceWithResults[] }).data ?? [];
      const users = (usersRes as { data: User[] }).data ?? [];
      const predictions = (predictionsRes as { data: Prediction[] }).data ?? [];

      const leaderboard = calculateLeaderboard(races, users, predictions, season);

      setData({
        races,
        users,
        predictions,
        leaderboard,
        error: null,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (err) {
      console.error("Failed to load data:", err);
      setData(prev => ({
        ...prev,
        error: "Failed to load data. Please try refreshing.",
        isLoading: false,
        isRefreshing: false,
      }));
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSeasonData(activeSeason);
  }, [activeSeason, loadSeasonData]);

  // Fetch available seasons on mount
  useEffect(() => {
    fetch("/api/races?action=seasons")
      .then(r => r.json())
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setAvailableSeasons(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch drivers when season changes
  useEffect(() => {
    fetch(`/api/races?action=drivers&season=${activeSeason}`)
      .then(r => r.json())
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setDrivers(res.data);
        }
      })
      .catch(() => {});
  }, [activeSeason]);

  // Switch season
  const switchSeason = useCallback((season: number) => {
    setActiveSeason(season);
  }, []);

  // Refresh all data from Jolpica
  const refreshFromAPI = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isRefreshing: true, error: null }));

      const res = await fetch(`/api/races?action=refresh&season=${activeSeason}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${res.status}`);
      }

      // Wait a moment then refetch all data
      await new Promise(resolve => setTimeout(resolve, 1500));

      const [racesRes, usersRes, predictionsRes] = await Promise.all([
        fetch(`/api/races?action=races&season=${activeSeason}`).then(r => r.json()),
        fetch("/api/data?type=users").then(r => r.json()),
        fetch(`/api/data?type=predictions&season=${activeSeason}`).then(r => r.json()),
      ]);

      const races = (racesRes as { data: RaceWithResults[] }).data ?? [];
      const users = (usersRes as { data: User[] }).data ?? [];
      const predictions = (predictionsRes as { data: Prediction[] }).data ?? [];
      const leaderboard = calculateLeaderboard(races, users, predictions, activeSeason);

      setData({
        races,
        users,
        predictions,
        leaderboard,
        error: null,
        isLoading: false,
        isRefreshing: false,
      });
    } catch (err) {
      console.error("Failed to refresh data:", err);
      setData(prev => ({
        ...prev,
        error: "Failed to refresh data. Please try again.",
        isLoading: false,
        isRefreshing: false,
      }));
    }
  }, [activeSeason]);

  // Helper: Calculate leaderboard from races, users, predictions
  function calculateLeaderboard(
    races: RaceWithResults[],
    users: User[],
    predictions: Prediction[],
    season: number
  ): LeaderboardEntry[] {
    const userMap = new Map<number, { username: string; totalPoints: number; racePoints: Record<number, number> }>();

    users.forEach(user => {
      userMap.set(user.id, {
        username: user.username,
        totalPoints: 0,
        racePoints: {},
      });
    });

    races.forEach(race => {
      userMap.forEach((userData) => {
        userData.racePoints[race.round] = 0;
      });
    });

    predictions.forEach(prediction => {
      const userData = userMap.get(prediction.userId);
      if (!userData) return;

      const race = races.find(r => r.name === prediction.raceName);
      if (!race) return;

      const points = calculatePoints(
        prediction.picks,
        race.results,
        prediction.isLate,
        false
      );

      userData.totalPoints += points;
      userData.racePoints[race.round] = points;
    });

    return Array.from(userMap.entries())
      .map(([userId, { username, totalPoints, racePoints }]) => ({
        userId,
        username,
        season,
        totalPoints,
        racePoints,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  // Additional API helpers
  const addUser = useCallback(async (username: string) => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", username, season: activeSeason }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to add user");
    const usersRes = await fetch("/api/data?type=users").then(r => r.json());
    setData(prev => ({ ...prev, users: (usersRes as { data: User[] }).data ?? [] }));
  }, [activeSeason]);

  const removeUser = useCallback(async (userId: number) => {
    const res = await fetch(`/api/data?type=user&userId=${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove user");
    const usersRes = await fetch("/api/data?type=users").then(r => r.json());
    setData(prev => ({ ...prev, users: (usersRes as { data: User[] }).data ?? [] }));
  }, []);

  const savePrediction = useCallback(async (
    userId: number,
    raceName: string,
    picks: string[],
    isLate: boolean
  ) => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "prediction",
        userId,
        season: activeSeason,
        raceName,
        picks,
        isLate,
      }),
    });
    if (!res.ok) throw new Error("Failed to save prediction");
    const predictionsRes = await fetch(`/api/data?type=predictions&season=${activeSeason}`).then(r => r.json());
    setData(prev => {
      const predictions = (predictionsRes as { data: Prediction[] }).data ?? [];
      const leaderboard = calculateLeaderboard(prev.races, prev.users, predictions, activeSeason);
      return { ...prev, predictions, leaderboard };
    });
  }, [activeSeason]);

  const removePrediction = useCallback(async (userId: number, season: number, raceName: string) => {
    const res = await fetch(
      `/api/data?type=prediction&userId=${userId}&raceName=${encodeURIComponent(raceName)}&season=${season}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to remove prediction");
    const predictionsRes = await fetch(`/api/data?type=predictions&season=${season}`).then(r => r.json());
    setData(prev => {
      const predictions = (predictionsRes as { data: Prediction[] }).data ?? [];
      const leaderboard = calculateLeaderboard(prev.races, prev.users, predictions, season);
      return { ...prev, predictions, leaderboard };
    });
  }, []);

  // Create new season
  const createSeason = useCallback(async (season: number) => {
    const res = await fetch(`/api/races?action=create-season&season=${season}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to create season");
    // Refresh seasons list and switch to new season
    const seasonsRes = await fetch("/api/races?action=seasons").then(r => r.json());
    if (seasonsRes.data && Array.isArray(seasonsRes.data)) {
      setAvailableSeasons(seasonsRes.data);
    }
    setActiveSeason(season);
  }, []);

  // Refresh drivers from API
  const refreshDrivers = useCallback(async () => {
    const res = await fetch(`/api/races?action=refresh-drivers&season=${activeSeason}`);
    const body = await res.json();
    if (!res.ok) throw new Error("Failed to refresh drivers");
    if (body.data && Array.isArray(body.data)) {
      setDrivers(body.data);
    }
  }, [activeSeason]);

  return {
    ...data,
    activeSeason,
    availableSeasons,
    drivers,
    switchSeason,
    createSeason,
    refreshDrivers,
    refreshFromAPI,
    refreshSingleRace: refreshFromAPI,
    addUser,
    removeUser,
    savePrediction,
    removePrediction,
  };
}