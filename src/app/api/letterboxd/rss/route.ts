import { NextRequest, NextResponse } from "next/server";
import { parseRSS } from "@/lib/letterboxd";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "username query parameter is required" },
        { status: 400 }
      );
    }

    const yearParam = searchParams.get("year");
    let entries = await parseRSS(username);

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      entries = entries.filter((entry) => entry.year === year);
    }

    return NextResponse.json(entries);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
