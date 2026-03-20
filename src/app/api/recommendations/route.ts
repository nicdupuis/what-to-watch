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

    // 1. Scrape the user's full watch history (for exclusion list)
    const allWatched = await scrapeAllWatchedFilms(username);

    if (allWatched.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Build a set of watched titles (normalized) to exclude from recommendations
    const watchedTitles = new Set(
      allWatched.map((entry) => normalize(entry.title))
    );

    // 3. Get the user's RSS diary to find highly-rated films (RSS has ratings)
    const { parseRSS } = await import("@/lib/letterboxd");
    const rssEntries = await parseRSS(username);

    // Pick only 5-star films — the user's absolute favorites
    const topRated = rssEntries
      .filter((e) => e.rating !== null && e.rating >= 5)
      .slice(0, 10);

    // If not enough 5-star films, fall back to 4.5+
    const seedFilms = topRated.length >= 2
      ? topRated
      : rssEntries.filter((e) => e.rating !== null && e.rating >= 4.5).slice(0, 8);

    // 4. Resolve TMDB IDs for seed films via search (RSS entries don't have slugs)
    const resolvedSeeds = await Promise.all(
      seedFilms.map(async (entry) => {
        try {
          const { searchMovie } = await import("@/lib/tmdb");
          const res = await searchMovie(entry.title, entry.year || undefined);
          const tmdbId = res.results[0]?.id ?? null;
          return { title: entry.title, rating: entry.rating, tmdbId };
        } catch {
          return { title: entry.title, rating: entry.rating, tmdbId: null };
        }
      })
    );

    // 5. For each seed film, get TMDB recommendations
    const recMap = new Map<
      number,
      { movie: TMDBMovie; basedOn: Set<string>; seedRatings: number[] }
    >();

    await Promise.all(
      resolvedSeeds
        .filter((f) => f.tmdbId !== null)
        .map(async (seed) => {
          const recs = await getRecommendations(seed.tmdbId!);
          for (const rec of recs) {
            if (watchedTitles.has(normalize(rec.title))) continue;

            const existing = recMap.get(rec.id);
            if (existing) {
              existing.basedOn.add(seed.title);
              existing.seedRatings.push(seed.rating ?? 4);
            } else {
              recMap.set(rec.id, {
                movie: rec,
                basedOn: new Set([seed.title]),
                seedRatings: [seed.rating ?? 4],
              });
            }
          }
        })
    );

    // 6. Build recommendations with scoring
    const filtered: Recommendation[] = [];
    for (const [, { movie, basedOn, seedRatings }] of recMap) {
      if (movie.vote_average < 5 && movie.vote_count > 0) continue;

      // Score: base from how many seed films recommended this
      let score = basedOn.size;

      // No recency boost — let quality and match count speak for themselves

      filtered.push({
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date ?? "",
        overview: movie.overview,
        voteAverage: movie.vote_average,
        genres: movie.genre_ids ?? [],
        score: Math.round(score * 10) / 10,
        basedOn: [...basedOn],
      });
    }

    // 7. Sort by score first, then by TMDB rating
    filtered.sort((a, b) => b.score - a.score || b.voteAverage - a.voteAverage);

    return NextResponse.json(filtered.slice(0, limit));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
