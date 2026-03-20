import { NextRequest, NextResponse } from "next/server";
import { scrapeList } from "@/lib/letterboxd";

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

    const slug = searchParams.get("slug") || "top-2026";
    const entries = await scrapeList(username, slug);

    return NextResponse.json(entries);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
