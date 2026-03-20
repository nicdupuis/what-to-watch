import { NextRequest, NextResponse } from "next/server";
import { getShowtimes } from "@/lib/cineplex";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const theatreId = searchParams.get("theatreId");
    const date = searchParams.get("date");

    if (!theatreId) {
      return NextResponse.json(
        { error: "theatreId is required" },
        { status: 400 }
      );
    }

    const dateStr =
      date || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

    const data = await getShowtimes(parseInt(theatreId, 10), dateStr);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
