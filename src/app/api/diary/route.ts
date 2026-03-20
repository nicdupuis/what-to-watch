import { NextRequest, NextResponse } from "next/server";
import { parseRSS } from "@/lib/letterboxd";
import { getMovieCredits, searchMovie } from "@/lib/tmdb";

interface DiaryMovie {
  title: string;
  year: number;
  watchedDate: string;
  rating: number | null;
  tmdbId: number;
  directors: string[];
  topCast: string[];
  genreIds: number[];
  posterPath: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get("username");
    if (!username) {
      return NextResponse.json(
        { error: "username is required" },
        { status: 400 }
      );
    }

    const watchedYear = parseInt(
      request.nextUrl.searchParams.get("watchedYear") || "2026",
      10
    );

    // Get RSS entries watched in the target year
    const rssEntries = await parseRSS(username);
    const yearEntries = rssEntries.filter(
      (e) => e.watchedDate && e.watchedDate.startsWith(String(watchedYear))
    );

    // Resolve TMDB data for each entry
    const results: DiaryMovie[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < yearEntries.length; i += BATCH_SIZE) {
      const batch = yearEntries.slice(i, i + BATCH_SIZE);
      const resolved = await Promise.all(
        batch.map(async (entry) => {
          try {
            const search = await searchMovie(entry.title, entry.year || undefined);
            const tmdb = search.results[0];
            if (!tmdb) {
              return {
                title: entry.title,
                year: entry.year,
                watchedDate: entry.watchedDate,
                rating: entry.rating,
                tmdbId: 0,
                directors: [],
                topCast: [],
                genreIds: [],
                posterPath: null,
              };
            }

            const credits = await getMovieCredits(tmdb.id);
            return {
              title: tmdb.title,
              year: entry.year,
              watchedDate: entry.watchedDate,
              rating: entry.rating,
              tmdbId: tmdb.id,
              directors: credits.directors,
              topCast: credits.topCast,
              genreIds: tmdb.genre_ids,
              posterPath: tmdb.poster_path,
            };
          } catch {
            return {
              title: entry.title,
              year: entry.year,
              watchedDate: entry.watchedDate,
              rating: entry.rating,
              tmdbId: 0,
              directors: [],
              topCast: [],
              genreIds: [],
              posterPath: null,
            };
          }
        })
      );
      results.push(...resolved);
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
