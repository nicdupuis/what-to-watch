import { NextRequest, NextResponse } from "next/server";
import { getTVDetail } from "@/lib/tmdb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tvId = parseInt(id, 10);

    if (isNaN(tvId)) {
      return NextResponse.json({ error: "Invalid TV show ID" }, { status: 400 });
    }

    const data = await getTVDetail(tvId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
