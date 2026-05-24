"use client";

import { useState, useEffect, useCallback } from "react";
import type { RaceWithResults, User, Prediction, LeaderboardEntry } from "@/lib/types";
import { calculatePoints } from "@/lib/scoring";
import { getCachedData, setCachedData } from "@/lib/db-sqlite";

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

        const races = racesRes as RaceWithResults[];
        const users = usersRes as User[];
        const predictions = predictionsRes as Prediction[];

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
      const res = await fetch("/api/races?action=refresh", {
        method: "POST",
      });
      
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
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

      const races = racesRes as RaceWithResults[];
      const users = usersRes as User[];
      const predictions = predictionsRes as Prediction[];
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
        userMap.get(userData.username)!.racePoints[race.round] = 0;
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

  return {
    ...data,
    refreshAllData,
  };
}