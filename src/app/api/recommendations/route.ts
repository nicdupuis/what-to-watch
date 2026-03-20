import { NextRequest, NextResponse } from "next/server";
import { scrapeAllWatchedFilms } from "@/lib/letterboxd";
import { getRecommendations } from "@/lib/tmdb";
import { TMDBMovie } from "@/types/movie";

interface Recommendation {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  overview: string;
  voteAverage: number;
  genres: number[];
  score: number;
  basedOn: string[];
}

function normalize(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"');
}

/**
 * Resolves a TMDB ID for a Letterboxd entry by fetching the film's
 * Letterboxd page and extracting the data-tmdb-id attribute.
 */
async function resolveSingleTmdbId(filmSlug: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://letterboxd.com/film/${filmSlug}/`,
      {
        next: { revalidate: 86400 },
        headers: { "User-Agent": "OscarTracker/1.0" },
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/data-tmdb-id="(\d+)"/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!username) {
      return NextResponse.json(
        { error: "username query parameter is required" },
        { status: 400 }
      );
    }

    // 1. Scrape the user's full watch history (no TMDB resolution — too slow)
    const allWatched = await scrapeAllWatchedFilms(username);

    if (allWatched.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Build a set of watched titles (normalized) to exclude from recommendations
    const watchedTitles = new Set(
      allWatched.map((entry) => normalize(entry.title))
    );

    // 3. Pick the 8 most recently watched films (first entries = most recent on Letterboxd)
    const recentFilms = allWatched.slice(0, 8);

    // 4. Resolve TMDB IDs for the recent films by fetching their Letterboxd pages
    const resolvedFilms = await Promise.all(
      recentFilms.map(async (entry) => {
        const tmdbId = await resolveSingleTmdbId(entry.filmSlug);
        return { ...entry, tmdbId };
      })
    );

    // 5. For each resolved TMDB ID, get recommendations
    const recMap = new Map<
      number,
      { movie: TMDBMovie; basedOn: Set<string> }
    >();

    await Promise.all(
      resolvedFilms
        .filter((f) => f.tmdbId !== null)
        .map(async (film) => {
          const recs = await getRecommendations(film.tmdbId!);
          for (const rec of recs) {
            // Skip movies the user has already watched
            if (watchedTitles.has(normalize(rec.title))) continue;

            const existing = recMap.get(rec.id);
            if (existing) {
              existing.basedOn.add(film.title);
            } else {
              recMap.set(rec.id, {
                movie: rec,
                basedOn: new Set([film.title]),
              });
            }
          }
        })
    );

    // 6. Filter to 2025-2026 releases only
    const filtered: Recommendation[] = [];
    for (const [, { movie, basedOn }] of recMap) {
      if (!movie.release_date) continue;
      const releaseYear = parseInt(movie.release_date.substring(0, 4), 10);
      if (releaseYear < 2025 || releaseYear > 2026) continue;

      filtered.push({
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        overview: movie.overview,
        voteAverage: movie.vote_average,
        genres: movie.genre_ids ?? [],
        score: basedOn.size,
        basedOn: [...basedOn],
      });
    }

    // 7. Sort by score (descending), then by vote average
    filtered.sort((a, b) => b.score - a.score || b.voteAverage - a.voteAverage);

    return NextResponse.json(filtered.slice(0, limit));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
