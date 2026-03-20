import { NextRequest, NextResponse } from "next/server";
import { discoverAllMovies } from "@/lib/tmdb";
import { parseRSS, scrapeList, scrapeTaggedFilms } from "@/lib/letterboxd";
import { MovieSummary } from "@/types/movie";
import { LetterboxdEntry, LetterboxdListEntry } from "@/types/letterboxd";

function normalize(title: string): string {
  return title.toLowerCase().trim();
}

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

    // 1. Fetch all TMDB discover results for the year
    const tmdbMovies = await discoverAllMovies(year);

    // 2. Fetch Letterboxd data (gracefully degrade on failure)
    let rssEntries: LetterboxdEntry[] = [];
    let listEntries: LetterboxdListEntry[] = [];
    let tagEntries: LetterboxdListEntry[] = [];

    try {
      const letterboxdPromises: Promise<void>[] = [];

      // Always fetch RSS and filter to the year
      letterboxdPromises.push(
        parseRSS(username).then((entries) => {
          rssEntries = entries.filter((e) => e.year === year);
        })
      );

      // Fetch tag-based films if tag is provided
      if (tag) {
        letterboxdPromises.push(
          scrapeTaggedFilms(username, tag).then((entries) => {
            tagEntries = entries;
          })
        );
      }

      // Fetch list-based films if listSlug is provided
      if (listSlug) {
        letterboxdPromises.push(
          scrapeList(username, listSlug).then((entries) => {
            listEntries = entries;
          })
        );
      }

      await Promise.all(letterboxdPromises);
    } catch {
      // If Letterboxd calls fail, continue with TMDB data only
      rssEntries = [];
      listEntries = [];
      tagEntries = [];
    }

    // 3. Build lookup maps from Letterboxd data
    // RSS entries have ratings and watchedDate -- keyed by normalized "title|year"
    const rssMap = new Map<string, LetterboxdEntry>();
    for (const entry of rssEntries) {
      const key = `${normalize(entry.title)}|${entry.year}`;
      // Keep the most recent entry if duplicates exist
      if (!rssMap.has(key) || entry.watchedDate > (rssMap.get(key)!.watchedDate)) {
        rssMap.set(key, entry);
      }
    }

    // Combine list and tag entries into a set of watched titles
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
