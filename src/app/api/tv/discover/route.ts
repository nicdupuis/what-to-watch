import { NextResponse } from "next/server";
import { discoverTV } from "@/lib/tmdb";

export async function GET() {
  try {
    const shows = await discoverTV();
    return NextResponse.json(shows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
