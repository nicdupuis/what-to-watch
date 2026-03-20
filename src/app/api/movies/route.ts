import { NextRequest, NextResponse } from "next/server";
import { discoverAllMovies, searchMovie } from "@/lib/tmdb";
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

// Minimum popularity for TMDB-only movies (not on the user's list).
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

    // 1. Fetch all data sources in parallel (each fails independently)
    const settled = await Promise.allSettled([
      listSlug ? scrapeList(username, listSlug) : Promise.resolve([]),
      tag ? scrapeTaggedFilms(username, tag) : Promise.resolve([]),
      parseRSS(username).then((entries) =>
        entries.filter((e) => e.year === year)
      ),
      discoverAllMovies(year),
    ]);

    const listEntries: LetterboxdListEntry[] =
      settled[0].status === "fulfilled" ? settled[0].value : [];
    const tagEntries: LetterboxdListEntry[] =
      settled[1].status === "fulfilled" ? settled[1].value : [];
    const rssEntries: LetterboxdEntry[] =
      settled[2].status === "fulfilled" ? settled[2].value : [];
    const tmdbMovies =
      settled[3].status === "fulfilled" ? settled[3].value : [];

    // 2. Build RSS lookup (has ratings + watched dates)
    const rssMap = new Map<string, LetterboxdEntry>();
    for (const entry of rssEntries) {
      const key = normalize(entry.title);
      if (
        !rssMap.has(key) ||
        entry.watchedDate > rssMap.get(key)!.watchedDate
      ) {
        rssMap.set(key, entry);
      }
    }

    // 3. Build TMDB lookup by normalized title
    const tmdbByTitle = new Map<
      string,
      (typeof tmdbMovies)[number]
    >();
    for (const m of tmdbMovies) {
      const key = normalize(m.title);
      // Keep the more popular entry if titles collide
      if (
        !tmdbByTitle.has(key) ||
        m.popularity > (tmdbByTitle.get(key)!.popularity ?? 0)
      ) {
        tmdbByTitle.set(key, m);
      }
    }

    // 4. Start with the user's Letterboxd list as the primary source.
    //    These are the movies the user explicitly tracks for the year.
    const results: MovieSummary[] = [];
    const seenTmdbIds = new Set<number>();

    // Merge list + tag entries (list takes priority for ranking)
    const allLetterboxd = new Map<string, LetterboxdListEntry>();
    // Tag entries first (lower priority)
    for (const entry of tagEntries) {
      allLetterboxd.set(normalize(entry.title), entry);
    }
    // List entries override (higher priority — they have rankings)
    for (const entry of listEntries) {
      allLetterboxd.set(normalize(entry.title), entry);
    }

    // For each Letterboxd entry, find TMDB data to enrich it
    const tmdbSearchPromises: Promise<void>[] = [];
    const letterboxdEnriched: {
      lbEntry: LetterboxdListEntry;
      tmdb: (typeof tmdbMovies)[number] | null;
    }[] = [];

    for (const [normalizedTitle, lbEntry] of allLetterboxd) {
      // Try local TMDB lookup first
      const tmdb = tmdbByTitle.get(normalizedTitle) ?? null;
      letterboxdEnriched.push({ lbEntry, tmdb });

      // If no local match, queue a TMDB search
      if (!tmdb) {
        const idx = letterboxdEnriched.length - 1;
        tmdbSearchPromises.push(
          searchMovie(lbEntry.title, lbEntry.year)
            .then((res) => {
              if (res.results.length > 0) {
                letterboxdEnriched[idx].tmdb = res.results[0];
              }
            })
            .catch(() => {
              // Search failed, leave tmdb as null
            })
        );
      }
    }

    // Resolve any TMDB search lookups
    await Promise.allSettled(tmdbSearchPromises);

    // Build MovieSummary for each Letterboxd entry
    for (const { lbEntry, tmdb } of letterboxdEnriched) {
      const normalizedTitle = normalize(lbEntry.title);
      const rssEntry = rssMap.get(normalizedTitle);

      // RSS tells us if the user watched it and their star rating
      const watched = !!rssEntry;

      const movie: MovieSummary = {
        tmdbId: tmdb?.id ?? 0,
        title: tmdb?.title ?? lbEntry.title,
        posterPath: tmdb?.poster_path ?? null,
        releaseDate: tmdb?.release_date ?? "",
        genreIds: tmdb?.genre_ids ?? [],
        overview: tmdb?.overview ?? "",
        voteAverage: tmdb?.vote_average ?? 0,
        watched,
        userRating: rssEntry?.rating ?? null,
        watchedDate: rssEntry?.watchedDate ?? null,
        listRanking: lbEntry.position,
        ownerRating: lbEntry.ownerRating,
        letterboxdSlug: lbEntry.filmSlug,
        source: "list",
      };

      if (tmdb) seenTmdbIds.add(tmdb.id);
      results.push(movie);
    }

    // 5. Add popular TMDB discover movies NOT already on the list.
    //    These are upcoming releases the user hasn't added yet.
    for (const movie of tmdbMovies) {
      if (seenTmdbIds.has(movie.id)) continue;
      if (movie.popularity < MIN_POPULARITY || !movie.poster_path) continue;

      const normalizedTitle = normalize(movie.title);
      const rssEntry = rssMap.get(normalizedTitle);
      const releaseYear = movie.release_date
        ? parseInt(movie.release_date.substring(0, 4), 10)
        : 0;
      if (releaseYear !== year) continue;

      results.push({
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        releaseDate: movie.release_date,
        genreIds: movie.genre_ids,
        overview: movie.overview,
        voteAverage: movie.vote_average,
        watched: !!rssEntry,
        userRating: rssEntry?.rating ?? null,
        watchedDate: rssEntry?.watchedDate ?? null,
        listRanking: null,
        ownerRating: null,
        letterboxdSlug: null,
        source: "discover",
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
