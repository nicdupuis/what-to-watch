import { NextRequest, NextResponse } from "next/server";
import { discoverAllMovies } from "@/lib/tmdb";
import { parseRSS, scrapeList, scrapeTaggedFilms } from "@/lib/letterboxd";
import { MovieSummary } from "@/types/movie";
import { LetterboxdEntry, LetterboxdListEntry } from "@/types/letterboxd";

function normalize(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"');
}

// Minimum popularity threshold to filter out obscure releases.
// TMDB popularity is roughly logarithmic — values above ~5 are
// movies with meaningful audience awareness. Setting this at 5
// keeps Oscar contenders (dramas, festival films) while dropping
// micro-budget and regional releases that clutter the grid.
const MIN_POPULARITY = 5;

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

    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear()),
      10
    );
    const listSlug = searchParams.get("listSlug");
    const tag = searchParams.get("tag");

    // 1. Fetch TMDB discover results (filtered for quality)
    const tmdbMoviesRaw = await discoverAllMovies(year);
    const tmdbMovies = tmdbMoviesRaw.filter(
      (m) => m.popularity >= MIN_POPULARITY && m.poster_path !== null
    );

    // 2. Fetch Letterboxd data — each source isolated so one failure
    //    doesn't nuke the others
    let rssEntries: LetterboxdEntry[] = [];
    let listEntries: LetterboxdListEntry[] = [];
    let tagEntries: LetterboxdListEntry[] = [];

    const settled = await Promise.allSettled([
      parseRSS(username).then((entries) => entries.filter((e) => e.year === year)),
      tag ? scrapeTaggedFilms(username, tag) : Promise.resolve([]),
      listSlug ? scrapeList(username, listSlug) : Promise.resolve([]),
    ]);

    if (settled[0].status === "fulfilled") rssEntries = settled[0].value;
    if (settled[1].status === "fulfilled") tagEntries = settled[1].value;
    if (settled[2].status === "fulfilled") listEntries = settled[2].value;

    // 3. Build lookup maps from Letterboxd data
    const rssMap = new Map<string, LetterboxdEntry>();
    for (const entry of rssEntries) {
      const key = `${normalize(entry.title)}|${entry.year}`;
      if (
        !rssMap.has(key) ||
        entry.watchedDate > rssMap.get(key)!.watchedDate
      ) {
        rssMap.set(key, entry);
      }
    }

    const letterboxdWatchedSet = new Set<string>();
    for (const entry of [...listEntries, ...tagEntries]) {
      letterboxdWatchedSet.add(`${normalize(entry.title)}|${entry.year}`);
    }

    // 4. Match and build MovieSummary[]
    const results: MovieSummary[] = tmdbMovies.map((movie) => {
      const releaseYear = movie.release_date
        ? parseInt(movie.release_date.substring(0, 4), 10)
        : 0;
      const key = `${normalize(movie.title)}|${releaseYear}`;

      const rssEntry = rssMap.get(key);
      const inList = letterboxdWatchedSet.has(key);
      const watched = !!rssEntry || inList;

      return {
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        genreIds: movie.genre_ids,
        overview: movie.overview,
        voteAverage: movie.vote_average,
        watched,
        userRating: rssEntry?.rating ?? null,
        watchedDate: rssEntry?.watchedDate ?? null,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
