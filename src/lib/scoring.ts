import { F1_POINTS } from "./constants";
import type { DriverBreakdown, RaceResult, ScoredPrediction } from "./types";

export function calculatePoints(
  prediction: string[],
  officialResults: RaceResult[],
  isLate: boolean = false,
  isMissing: boolean = false
): number {
  if (!prediction.length || !officialResults.length) return 0;

  const officialMap = new Map<string, number>();
  for (const r of officialResults) {
    officialMap.set(r.id, r.points);
  }
  const officialTop5Ids = officialResults.slice(0, 5).map((r) => r.id);

  let total = 0;
  for (let pos = 0; pos < Math.min(prediction.length, 5); pos++) {
    const driver = prediction[pos];
    if (officialTop5Ids.includes(driver)) {
      const driverRealPoints = officialMap.get(driver) ?? 0;
      if (
        pos < officialResults.length &&
        officialResults[pos].id === driver
      ) {
        total += driverRealPoints;
      } else {
        total += driverRealPoints / 2;
      }
    }
  }

  if (isLate || isMissing) {
    total *= 0.5;
  }

  return total;
}

export function calculateDriverBreakdown(
  prediction: string[],
  officialResults: RaceResult[],
  isLate: boolean = false,
  isMissing: boolean = false
): ScoredPrediction {
  const breakdown: DriverBreakdown[] = [];

  if (!prediction.length || !officialResults.length) {
    return { breakdown, subtotal: 0, finalTotal: 0, isLate, isMissing };
  }

  const officialMap = new Map<string, number>();
  for (const r of officialResults) {
    officialMap.set(r.id, r.points);
  }
  const officialTop5Ids = officialResults.slice(0, 5).map((r) => r.id);

  let subtotal = 0;
  for (let pos = 0; pos < Math.min(prediction.length, 5); pos++) {
    const driver = prediction[pos];
    const posNum = pos + 1;
    let earned = 0;
    let detail = "";

    if (officialTop5Ids.includes(driver)) {
      const driverRaw = officialMap.get(driver) ?? 0;
      const actualPos = officialTop5Ids.indexOf(driver) + 1;
      if (
        pos < officialResults.length &&
        officialResults[pos].id === driver
      ) {
        earned = driverRaw;
        detail = `Correct P${posNum}`;
      } else {
        earned = driverRaw / 2;
        detail = `In top 5 (actual P${actualPos})`;
      }
    } else {
      earned = 0;
      detail = "Not in top 5";
    }

    subtotal += earned;
    breakdown.push({ pos: posNum, driver, earned, detail });
  }

  const finalTotal = isLate || isMissing ? subtotal * 0.5 : subtotal;

  return { breakdown, subtotal, finalTotal, isLate, isMissing };
}

export function getPointsForPosition(position: number): number {
  return F1_POINTS[position] ?? 0;
}
