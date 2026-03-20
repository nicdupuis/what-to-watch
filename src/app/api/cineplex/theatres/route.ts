import { NextResponse } from "next/server";
import { getTheatres } from "@/lib/cineplex";

export async function GET() {
  try {
    const theatres = await getTheatres();
    return NextResponse.json(theatres);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
