import { NextRequest, NextResponse } from "next/server";
import { getTopRatedTV } from "@/lib/tmdb";

export async function GET(_request: NextRequest) {
  try {
    const data = await getTopRatedTV();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
