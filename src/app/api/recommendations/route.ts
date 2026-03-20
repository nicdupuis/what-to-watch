import { NextRequest, NextResponse } from "next/server";
import { scrapeAllWatchedFilms, scrapeRatedFilms } from "@/lib/letterboxd";
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

// Don't cache this route — each request should give fresh random seeds
export const dynamic = "force-dynamic";

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

    // 1. Fetch in parallel: full watch history (for exclusion) + all 5-star films (for seeds)
    const [allWatched, fiveStarFilms] = await Promise.all([
      scrapeAllWatchedFilms(username),
      scrapeRatedFilms(username, 5),
    ]);

    if (allWatched.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Build a set of watched titles (normalized) to exclude from recommendations
    const watchedTitles = new Set(
      allWatched.map((entry) => normalize(entry.title))
    );

    // 3. Pick a random sample of 5-star films as seeds
    //    Shuffle and pick 10 so each refresh gives different results
    const maxSeeds = 10;
    const shuffled = [...fiveStarFilms].sort(() => Math.random() - 0.5);
    const seedEntries = shuffled.slice(0, maxSeeds);

    // 4. Resolve TMDB IDs via Letterboxd film pages (slug-based, reliable)
    const resolvedSeeds = await Promise.all(
      seedEntries.map(async (entry) => {
        const tmdbId = await resolveSingleTmdbId(entry.filmSlug);
        return { title: entry.title, tmdbId };
      })
    );

    // 5. For each seed film, get TMDB recommendations
    const recMap = new Map<
      number,
      { movie: TMDBMovie; basedOn: Set<string> }
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
            } else {
              recMap.set(rec.id, {
                movie: rec,
                basedOn: new Set([seed.title]),
              });
            }
          }
        })
    );

    // 6. Build recommendations with scoring
    const filtered: Recommendation[] = [];
    for (const [, { movie, basedOn }] of recMap) {
      if (movie.vote_average < 5 && movie.vote_count > 0) continue;

      // Score = how many of the user's 5-star films recommended this
      const score = basedOn.size;

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
