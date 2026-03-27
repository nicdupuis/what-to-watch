import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { scrapeAllWatchedFilms, scrapeRatedFilms } from "@/lib/letterboxd";
import { getRecommendations } from "@/lib/tmdb";
import { TMDBMovie } from "@/types/movie";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

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

async function resolveSingleTmdbId(filmSlug: string): Promise<number | null> {
  try {
    const res = await fetch(`https://letterboxd.com/film/${filmSlug}/`, {
      next: { revalidate: 86400 },
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/data-tmdb-id="(\d+)"/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Disabled on Vercel — heavy scraping exceeds serverless timeout
  if (process.env.VERCEL) {
    return NextResponse.json([]);
  }

  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const { allowed } = rateLimit(`recs:${ip}`, 3, 3);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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

    const [allWatchedResult, fiveStarResult] = await Promise.allSettled([
      scrapeAllWatchedFilms(username),
      scrapeRatedFilms(username, 5),
    ]);
    const allWatched =
      allWatchedResult.status === "fulfilled" ? allWatchedResult.value : [];
    const fiveStarFilms =
      fiveStarResult.status === "fulfilled" ? fiveStarResult.value : [];

    if (allWatched.length === 0) {
      return NextResponse.json([]);
    }

    const watchedTitles = new Set(
      allWatched.map((entry) => normalize(entry.title))
    );

    const maxSeeds = 10;
    const shuffled = [...fiveStarFilms].sort(() => Math.random() - 0.5);
    const seedEntries = shuffled.slice(0, maxSeeds);

    const resolvedSeeds = await Promise.all(
      seedEntries.map(async (entry) => {
        const tmdbId = await resolveSingleTmdbId(entry.filmSlug);
        return { title: entry.title, tmdbId };
      })
    );

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
              recMap.set(rec.id, { movie: rec, basedOn: new Set([seed.title]) });
            }
          }
        })
    );

    const filtered: Recommendation[] = [];
    for (const [, { movie, basedOn }] of recMap) {
      if (movie.vote_average < 5 && movie.vote_count > 0) continue;
      filtered.push({
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date ?? "",
        overview: movie.overview,
        voteAverage: movie.vote_average,
        genres: movie.genre_ids ?? [],
        score: Math.round(basedOn.size * 10) / 10,
        basedOn: [...basedOn],
      });
    }

    filtered.sort((a, b) => b.score - a.score || b.voteAverage - a.voteAverage);
    return NextResponse.json(filtered.slice(0, limit));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
