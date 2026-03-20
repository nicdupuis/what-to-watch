import { NextRequest, NextResponse } from "next/server";
import { getOnTheAirTV } from "@/lib/tmdb";

export async function GET(_request: NextRequest) {
  try {
    const data = await getOnTheAirTV();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
