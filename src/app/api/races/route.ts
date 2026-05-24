import { NextRequest, NextResponse } from "next/server";
import { fetchCalendar, fetchResults, fetchAllResults, FALLBACK_RESULTS } from "@/lib/jolpica";
import { getCachedData, setCachedData, upsertRaces, saveResults, getRacesWithResults } from "@/lib/db-sqlite";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  const season = searchParams.get("season") || "2026";

  try {
    switch (action) {
      case "calendar": {
        // Check cache first
        const cached = await getCachedData(`calendar_${season}`, 600000);
        if (cached) {
          return NextResponse.json({ data: cached, source: "cache" });
        }
        const calendar = await fetchCalendar(season);
        if (calendar) {
          await setCachedData(`calendar_${season}`, calendar);
          await upsertRaces(calendar);
          return NextResponse.json({ data: calendar, source: "api" });
        }
        // Fallback to DB
        const races = await getRacesWithResults();
        return NextResponse.json({ data: races, source: "db" });
      }

      case "results": {
        const roundParam = searchParams.get("round");
        if (!roundParam) {
          return NextResponse.json({ error: "Missing round parameter" }, { status: 400 });
        }
        const round = parseInt(roundParam);
        const data = await fetchResults(round, season);
        if (data.length > 0) {
          await saveResults(round, data);
        }
        return NextResponse.json({ data });
      }

      case "refresh": {
        const result = await fetchAllResults(season);
        if (!result) {
          return NextResponse.json({ error: "API unavailable" }, { status: 503 });
        }
        // Save calendar and results to DB
        await upsertRaces(result.calendar);
        for (const [round, res] of Object.entries(result.results)) {
          await saveResults(parseInt(round), res);
        }
        return NextResponse.json({
          calendar: result.calendar,
          results: result.results,
          resultsCount: Object.keys(result.results).length,
        });
      }

      case "races": {
        const races = await getRacesWithResults();
        return NextResponse.json({ data: races });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[API] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
