import { NextRequest, NextResponse } from "next/server";
import { discoverAllMovies, getMovieBasic, getMovieCredits } from "@/lib/tmdb";
import { parseRSS, scrapeList, scrapeTaggedFilms } from "@/lib/letterboxd";
import { MovieSummary, TMDBMovie } from "@/types/movie";
import { LetterboxdEntry, LetterboxdListEntry } from "@/types/letterboxd";

function normalize(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"');
}

const MIN_POPULARITY = 10;

/**
 * Enriches Letterboxd entries with TMDB data.
 * Uses the TMDB ID resolved from Letterboxd film pages (most reliable),
 * falls back to title lookup in the discover cache, then TMDB search.
 */
async function enrichWithTMDB(
  entries: LetterboxdListEntry[],
  tmdbByTitle: Map<string, TMDBMovie>,
  tmdbById: Map<number, TMDBMovie>
): Promise<{ entry: LetterboxdListEntry; tmdb: TMDBMovie | null }[]> {
  const results: { entry: LetterboxdListEntry; tmdb: TMDBMovie | null }[] = [];
  const fetchPromises: Promise<void>[] = [];

  for (const entry of entries) {
    // 1. Try direct TMDB ID lookup (resolved from Letterboxd film page)
    let tmdb: TMDBMovie | null = null;
    if (entry.tmdbId) {
      tmdb = tmdbById.get(entry.tmdbId) ?? null;
    }

    // 2. Try title match in discover cache
    if (!tmdb) {
      tmdb = tmdbByTitle.get(normalize(entry.title)) ?? null;
    }

    results.push({ entry, tmdb });

    // 3. If still no match but we have a TMDB ID, fetch directly
    if (!tmdb && entry.tmdbId) {
      const idx = results.length - 1;
      fetchPromises.push(
        getMovieBasic(entry.tmdbId).then((movie) => {
          if (movie) results[idx].tmdb = movie;
        })
      );
    }
  }

  await Promise.allSettled(fetchPromises);
  return results;
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
    const anticipatedListUrl = searchParams.get("anticipatedListUrl");
    const tag = searchParams.get("tag");
    const noCache = searchParams.get("noCache") === "true";

    // 1. Fetch all data sources in parallel
    const fetchOptions = noCache
      ? { next: { revalidate: 0 } }
      : undefined;

    const settled = await Promise.allSettled([
      listSlug
        ? scrapeList(username, listSlug)
        : Promise.resolve([]),
      anticipatedListUrl
        ? scrapeList(anticipatedListUrl)
        : Promise.resolve([]),
      tag ? scrapeTaggedFilms(username, tag) : Promise.resolve([]),
      parseRSS(username).then((entries) =>
        entries.filter((e) => e.year === year)
      ),
      discoverAllMovies(year),
    ]);

    const watchedListEntries: LetterboxdListEntry[] =
      settled[0].status === "fulfilled" ? settled[0].value : [];
    const anticipatedEntries: LetterboxdListEntry[] =
      settled[1].status === "fulfilled" ? settled[1].value : [];
    const tagEntries: LetterboxdListEntry[] =
      settled[2].status === "fulfilled" ? settled[2].value : [];
    const rssEntries: LetterboxdEntry[] =
      settled[3].status === "fulfilled" ? settled[3].value : [];
    const tmdbMovies =
      settled[4].status === "fulfilled" ? settled[4].value : [];

    // 2. Build RSS lookup (has star ratings + watched dates)
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

    // 3. Build TMDB lookups (by title and by ID)
    const tmdbByTitle = new Map<string, TMDBMovie>();
    const tmdbById = new Map<number, TMDBMovie>();
    for (const m of tmdbMovies) {
      const key = normalize(m.title);
      if (
        !tmdbByTitle.has(key) ||
        m.popularity > (tmdbByTitle.get(key)!.popularity ?? 0)
      ) {
        tmdbByTitle.set(key, m);
      }
      tmdbById.set(m.id, m);
    }

    // 4. Build anticipated set for cross-referencing
    const anticipatedSlugs = new Set(
      anticipatedEntries.map((e) => normalize(e.title))
    );

    // 5. Process watched list (tag entries merged in as fallback)
    const allWatched = new Map<string, LetterboxdListEntry>();
    for (const entry of tagEntries) {
      allWatched.set(normalize(entry.title), entry);
    }
    for (const entry of watchedListEntries) {
      allWatched.set(normalize(entry.title), entry);
    }

    const results: MovieSummary[] = [];
    const seenTmdbIds = new Set<number>();
    const seenTitles = new Set<string>();

    // Enrich watched list with TMDB
    const enrichedWatched = await enrichWithTMDB(
      [...allWatched.values()],
      tmdbByTitle,
      tmdbById
    );

    for (const { entry, tmdb } of enrichedWatched) {
      const normalizedTitle = normalize(entry.title);
      const rssEntry = rssMap.get(normalizedTitle);

      results.push({
        tmdbId: tmdb?.id ?? 0,
        title: tmdb?.title ?? entry.title,
        posterPath: tmdb?.poster_path ?? null,
        backdropPath: tmdb?.backdrop_path ?? null,
        releaseDate: tmdb?.release_date ?? "",
        genreIds: tmdb?.genre_ids ?? [],
        overview: tmdb?.overview ?? "",
        voteAverage: tmdb?.vote_average ?? 0,
        popularity: tmdb?.popularity ?? 0,
        watched: !!rssEntry,
        userRating: rssEntry?.rating ?? null,
        watchedDate: rssEntry?.watchedDate ?? null,
        listRanking: entry.position,
        ownerRating: entry.ownerRating,
        letterboxdSlug: entry.filmSlug,
        source: "watched-list",
        anticipated: anticipatedSlugs.has(normalizedTitle),
        directors: [],
        topCast: [],
      });

      if (tmdb) seenTmdbIds.add(tmdb.id);
      seenTitles.add(normalizedTitle);
    }

    // 6. Process anticipated list (entries not already in watched list)
    const newAnticipated = anticipatedEntries.filter(
      (e) => !seenTitles.has(normalize(e.title))
    );
    const enrichedAnticipated = await enrichWithTMDB(
      newAnticipated,
      tmdbByTitle,
      tmdbById
    );

    for (const { entry, tmdb } of enrichedAnticipated) {
      const normalizedTitle = normalize(entry.title);
      const rssEntry = rssMap.get(normalizedTitle);

      results.push({
        tmdbId: tmdb?.id ?? 0,
        title: tmdb?.title ?? entry.title,
        posterPath: tmdb?.poster_path ?? null,
        backdropPath: tmdb?.backdrop_path ?? null,
        releaseDate: tmdb?.release_date ?? "",
        genreIds: tmdb?.genre_ids ?? [],
        overview: tmdb?.overview ?? "",
        voteAverage: tmdb?.vote_average ?? 0,
        popularity: tmdb?.popularity ?? 0,
        watched: !!rssEntry,
        userRating: rssEntry?.rating ?? null,
        watchedDate: rssEntry?.watchedDate ?? null,
        listRanking: null,
        ownerRating: null,
        letterboxdSlug: entry.filmSlug,
        source: "anticipated",
        anticipated: true,
        directors: [],
        topCast: [],
      });

      if (tmdb) seenTmdbIds.add(tmdb.id);
      seenTitles.add(normalizedTitle);
    }

    // 7. Add popular TMDB discover movies not on either list
    for (const movie of tmdbMovies) {
      if (seenTmdbIds.has(movie.id)) continue;
      if (movie.popularity < MIN_POPULARITY || !movie.poster_path) continue;

      const normalizedTitle = normalize(movie.title);
      if (seenTitles.has(normalizedTitle)) continue;

      const releaseYear = movie.release_date
        ? parseInt(movie.release_date.substring(0, 4), 10)
        : 0;
      if (releaseYear !== year) continue;

      const rssEntry = rssMap.get(normalizedTitle);

      results.push({
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date,
        genreIds: movie.genre_ids,
        overview: movie.overview,
        voteAverage: movie.vote_average,
        popularity: movie.popularity,
        watched: !!rssEntry,
        userRating: rssEntry?.rating ?? null,
        watchedDate: rssEntry?.watchedDate ?? null,
        listRanking: null,
        ownerRating: null,
        letterboxdSlug: null,
        source: "discover",
        anticipated: false,
        directors: [],
        topCast: [],
      });
    }

    // 8. Batch-fetch credits for all movies with a valid tmdbId
    const moviesToFetch = results.filter((m) => m.tmdbId > 0);
    const BATCH_SIZE = 20;
    for (let i = 0; i < moviesToFetch.length; i += BATCH_SIZE) {
      const batch = moviesToFetch.slice(i, i + BATCH_SIZE);
      const creditResults = await Promise.all(
        batch.map((m) => getMovieCredits(m.tmdbId))
      );
      for (let j = 0; j < batch.length; j++) {
        batch[j].directors = creditResults[j].directors;
        batch[j].topCast = creditResults[j].topCast;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
