import { NextRequest, NextResponse } from "next/server";
import { fetchCalendar, fetchResults, fetchAllResults, fetchDrivers } from "@/lib/jolpica";
import { getCachedData, setCachedData, upsertRaces, saveResults, getRacesWithResults, seedFallbackCalendar } from "@/lib/db-sqlite";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  const season = parseInt(searchParams.get("season") || String(new Date().getFullYear()));

  try {
    switch (action) {
      case "calendar": {
        // Check cache first
        const cached = await getCachedData(`calendar_${season}`, 600000);
        if (cached) {
          return NextResponse.json({ data: cached, source: "cache" });
        }
        const calendar = await fetchCalendar(String(season));
        if (calendar) {
          const racesWithSeason = calendar.map(r => ({ ...r, season }));
          await setCachedData(`calendar_${season}`, racesWithSeason);
          await upsertRaces(season, racesWithSeason);
          return NextResponse.json({ data: calendar, source: "api" });
        }
        // Fallback: seed from constants then return from DB
        await seedFallbackCalendar(season);
        const races = await getRacesWithResults(season);
        return NextResponse.json({ data: races, source: "db" });
      }

      case "results": {
        const roundParam = searchParams.get("round");
        if (!roundParam) {
          return NextResponse.json({ error: "Missing round parameter" }, { status: 400 });
        }
        const round = parseInt(roundParam);
        const data = await fetchResults(round, String(season));
        if (data.length > 0) {
          await saveResults(season, round, data);
        }
        return NextResponse.json({ data });
      }

      case "refresh": {
        const result = await fetchAllResults(String(season));
        if (!result) {
          return NextResponse.json({ error: "API unavailable" }, { status: 503 });
        }
        // Save calendar and results to DB
        const racesWithSeason = result.calendar.map(r => ({ ...r, season }));
        await upsertRaces(season, racesWithSeason);
        for (const [round, res] of Object.entries(result.results)) {
          await saveResults(season, parseInt(round), res);
        }
        return NextResponse.json({
          season,
          calendar: result.calendar,
          results: result.results,
          resultsCount: Object.keys(result.results).length,
        });
      }

      case "races": {
        const races = await getRacesWithResults(season);
        return NextResponse.json({ data: races });
      }

      case "seasons": {
        // Return available seasons from the races table
        const { getRaces } = await import("@/lib/db-sqlite");
        // Check a few known seasons for data
        const currentYear = new Date().getFullYear();
        const seasons = [];
        for (let y = 2000; y <= currentYear + 1; y++) {
          const races = await getRaces(y);
          if (races.length > 0) seasons.push(y);
        }
        // Always include current year
        if (!seasons.includes(currentYear)) {
          seasons.push(currentYear);
        }
        return NextResponse.json({ data: seasons });
      }

      case "create-season": {
        const newSeason = parseInt(searchParams.get("season") || "0");
        if (newSeason < 2000 || newSeason > 2099) {
          return NextResponse.json({ error: "Season must be a year between 2000 and 2099" }, { status: 400 });
        }
        await seedFallbackCalendar(newSeason);
        return NextResponse.json({ success: true, season: newSeason });
      }

      case "drivers": {
        const cached = await getCachedData(`drivers_${season}`, 300000);
        if (cached) {
          return NextResponse.json({ data: cached, source: "cache" });
        }
        const drivers = await fetchDrivers(String(season));
        if (drivers.length > 0) {
          await setCachedData(`drivers_${season}`, drivers);
        }
        return NextResponse.json({ data: drivers, source: drivers.length > 0 ? "api" : "empty" });
      }

      case "refresh-drivers": {
        const drivers = await fetchDrivers(String(season));
        if (drivers.length > 0) {
          await setCachedData(`drivers_${season}`, drivers);
        }
        return NextResponse.json({ data: drivers, source: "api" });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[API /api/races] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}