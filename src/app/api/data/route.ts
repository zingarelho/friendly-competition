import { NextRequest, NextResponse } from "next/server";
import {
  getUsers,
  addUser,
  removeUser,
  getPredictions,
  savePrediction,
  removePrediction,
  seedFallbackCalendar,
} from "@/lib/db-sqlite";

// ─── GET: fetch all users or all predictions ─────────────

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const season = searchParams.get("season");

    if (type === "predictions") {
      const s = season ? parseInt(season) : undefined;
      const predictions = await getPredictions(s);
      return NextResponse.json({ data: predictions });
    }

    const users = await getUsers();
    return NextResponse.json({ data: users });
  } catch (err) {
    console.error("[API /api/data] GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── POST: add user or save prediction ──────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;
    const season = body.season ?? new Date().getFullYear();

    if (type === "user") {
      const { username } = body;
      if (!username || typeof username !== "string" || username.trim().length < 2) {
        return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
      }
      const user = await addUser(username.trim());
      // Seed fallback calendar for current season when first user is added
      await seedFallbackCalendar(season).catch(() => {});
      return NextResponse.json({ data: user });
    }

    if (type === "prediction") {
      const { userId, raceName, picks, isLate } = body;
      if (!userId || !raceName || !Array.isArray(picks) || picks.length !== 5) {
        return NextResponse.json({ error: "Invalid prediction data. Must have exactly 5 picks." }, { status: 400 });
      }
      const validPattern = /^[A-Z]{3}$/;
      for (const pick of picks) {
        if (!validPattern.test(pick)) {
          return NextResponse.json({ error: `Invalid driver code: ${pick}. Must be 3 uppercase letters.` }, { status: 400 });
        }
      }
      const unique = new Set(picks);
      if (unique.size !== picks.length) {
        return NextResponse.json({ error: "Duplicate driver codes in picks" }, { status: 400 });
      }
      await savePrediction(userId, season, raceName, picks, Boolean(isLate));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[API /api/data] POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── DELETE: remove user or prediction ──────────────────

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const season = parseInt(searchParams.get("season") || String(new Date().getFullYear()));

    if (type === "user") {
      const userId = parseInt(searchParams.get("userId") || "0");
      if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
      await removeUser(userId);
      return NextResponse.json({ success: true });
    }

    if (type === "prediction") {
      const userId = parseInt(searchParams.get("userId") || "0");
      const raceName = searchParams.get("raceName");
      if (!userId || !raceName) return NextResponse.json({ error: "Missing userId or raceName" }, { status: 400 });
      await removePrediction(userId, season, raceName);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[API /api/data] DELETE error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}