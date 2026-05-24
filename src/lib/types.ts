export interface Driver {
  code: string;
  name: string;
  team: string;
  color: string;
}

export interface Race {
  round: number;
  name: string;
  date: string;
}

export interface RaceResult {
  id: string;
  points: number;
}

export interface Prediction {
  id?: number;
  userId: number;
  username: string;
  raceName: string;
  picks: string[];
  isLate: boolean;
  createdAt?: string;
}

export interface User {
  id: number;
  username: string;
  isActive: boolean;
  createdAt?: string;
}

export interface DriverBreakdown {
  pos: number;
  driver: string;
  earned: number;
  detail: string;
}

export interface ScoredPrediction {
  breakdown: DriverBreakdown[];
  subtotal: number;
  finalTotal: number;
  isLate: boolean;
  isMissing: boolean;
  carriedFrom?: string;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  totalPoints: number;
  racePoints: Record<number, number>;
}

export interface RaceWithResults extends Race {
  results: RaceResult[];
  status: "finished" | "scheduled";
}
