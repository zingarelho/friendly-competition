"use client";

import { useState, useEffect, useCallback } from "react";
import type { RaceWithResults, User, Prediction, LeaderboardEntry } from "@/lib/types";
import { calculatePoints } from "@/lib/scoring";

interface AppData {
  races: RaceWithResults[];
  users: User[];
  predictions: Prediction[];
  leaderboard: LeaderboardEntry[];
  error: string | null;
  isLoading: boolean;      // Initial load
  isRefreshing: boolean;   // Manual refresh
}

export function useAppData() {
  const [data, setData] = useState<AppData>({
    races: [],
    users: [],
    predictions: [],
    leaderboard: [],
    error: null,
    isLoading: true,
    isRefreshing: false,
  });

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Fetch all data in parallel
        const [
          racesRes,
          usersRes,
          predictionsRes,
        ] = await Promise.all([
          fetch("/api/races?action=races").then(r => r.json()),
          fetch("/api/data?type=users").then(r => r.json()),
          fetch("/api/data?type=predictions").then(r => r.json()),
        ]);

        if (!isMounted) return;

        const races = (racesRes as { data: RaceWithResults[] }).data;
        const users = (usersRes as { data: User[] }).data;
        const predictions = (predictionsRes as { data: Prediction[] }).data;

        // Calculate leaderboard
        const leaderboard = calculateLeaderboard(races, users, predictions);

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
        if (!isMounted) return;
        console.error("Failed to load initial data:", err);
        setData(prev => ({ 
          ...prev, 
          error: "Failed to load data. Please try refreshing.", 
          isLoading: false,
          isRefreshing: false 
        }));
      }
    };

    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh all data from Jolpica
  const refreshAllData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isRefreshing: true, error: null }));
      
      // Trigger refresh via API
      const res = await fetch("/api/races?action=refresh");
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${res.status}`);
      }
      
      // Wait a moment then refetch all data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const [
        racesRes,
        usersRes,
        predictionsRes,
      ] = await Promise.all([
        fetch("/api/races?action=races").then(r => r.json()),
        fetch("/api/data?type=users").then(r => r.json()),
        fetch("/api/data?type=predictions").then(r => r.json()),
      ]);

      const races = (racesRes as { data: RaceWithResults[] }).data;
      const users = (usersRes as { data: User[] }).data;
      const predictions = (predictionsRes as { data: Prediction[] }).data;
      const leaderboard = calculateLeaderboard(races, users, predictions);

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
        isRefreshing: false 
      }));
    }
  }, []);

  // Helper: Calculate leaderboard from races, users, predictions
  function calculateLeaderboard(
    races: RaceWithResults[],
    users: User[],
    predictions: Prediction[]
  ): LeaderboardEntry[] {
    // Map userId -> { username, totalPoints, racePoints }
    const userMap = new Map<number, { username: string; totalPoints: number; racePoints: Record<number, number> }>();
    
    users.forEach(user => {
      userMap.set(user.id, {
        username: user.username,
        totalPoints: 0,
        racePoints: {},
      });
    });

    // Initialize race points for each user
    races.forEach(race => {
      userMap.forEach((userData) => {
        userData.racePoints[race.round] = 0;
      });
    });

    // Calculate points per race per user
    predictions.forEach(prediction => {
      const userData = userMap.get(prediction.userId);
      if (!userData) return;
      
      const race = races.find(r => r.name === prediction.raceName);
      if (!race) return;
      
      // Calculate points for this prediction
      const points = calculatePoints(
        prediction.picks,
        race.results,
        prediction.isLate,
        false // isMissing handled elsewhere
      );
      
      userData.totalPoints += points;
      userData.racePoints[race.round] = points;
    });

    // Convert to array and sort by total points descending
    return Array.from(userMap.entries())
      .map(([userId, { username, totalPoints, racePoints }]) => ({
        userId,
        username,
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
      body: JSON.stringify({ type: "user", username }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to add user");
    // Refetch users
    const usersRes = await fetch("/api/data?type=users").then(r => r.json());
    setData(prev => ({ ...prev, users: (usersRes as { data: User[] }).data }));
  }, []);

  const removeUser = useCallback(async (userId: number) => {
    const res = await fetch(`/api/data?type=user&userId=${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove user");
    const usersRes = await fetch("/api/data?type=users").then(r => r.json());
    setData(prev => ({ ...prev, users: (usersRes as { data: User[] }).data }));
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
      body: JSON.stringify({ type: "prediction", userId, raceName, picks, isLate }),
    });
    if (!res.ok) throw new Error("Failed to save prediction");
    // Refetch predictions and recalculate
    const predictionsRes = await fetch("/api/data?type=predictions").then(r => r.json());
    setData(prev => {
      const predictions = (predictionsRes as { data: Prediction[] }).data;
      const leaderboard = calculateLeaderboard(prev.races, prev.users, predictions);
      return { ...prev, predictions, leaderboard };
    });
  }, []);

  const removePrediction = useCallback(async (userId: number, raceName: string) => {
    const res = await fetch(`/api/data?type=prediction&userId=${userId}&raceName=${encodeURIComponent(raceName)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to remove prediction");
    const predictionsRes = await fetch("/api/data?type=predictions").then(r => r.json());
    setData(prev => {
      const predictions = (predictionsRes as { data: Prediction[] }).data;
      const leaderboard = calculateLeaderboard(prev.races, prev.users, predictions);
      return { ...prev, predictions, leaderboard };
    });
  }, []);

  return {
    ...data,
    refreshFromAPI: refreshAllData,
    refreshSingleRace: refreshAllData,
    addUser,
    removeUser,
    savePrediction,
    removePrediction,
  };
}