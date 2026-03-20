import { NextRequest, NextResponse } from "next/server";
import { discoverAllMovies, getMovieCredits, searchMovie } from "@/lib/tmdb";
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

const MIN_POPULARITY = 5;

/**
 * Picks the best TMDB match from search results.
 * Prefers: exact year match > future release > most popular.
 */
function pickBestMatch(
  results: TMDBMovie[],
  targetYear: number
): TMDBMovie | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  // If we have a target year, prefer exact match
  if (targetYear > 0) {
    const yearMatch = results.find((m) => {
      const y = m.release_date ? parseInt(m.release_date.substring(0, 4), 10) : 0;
      return y === targetYear;
    });
    if (yearMatch) return yearMatch;
  }

  // Prefer recent/upcoming releases (2025+)
  const recent = results.filter((m) => {
    const y = m.release_date ? parseInt(m.release_date.substring(0, 4), 10) : 0;
    return y >= 2025;
  });
  if (recent.length > 0) {
    return recent.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
  }

  // Fall back to most popular
  return results.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0];
}

async function enrichWithTMDB(
  entries: LetterboxdListEntry[],
  tmdbByTitle: Map<string, TMDBMovie>,
  trackingYear: number
): Promise<{ entry: LetterboxdListEntry; tmdb: TMDBMovie | null }[]> {
  const results: { entry: LetterboxdListEntry; tmdb: TMDBMovie | null }[] = [];
  const searchPromises: Promise<void>[] = [];

  for (const entry of entries) {
    const tmdb = tmdbByTitle.get(normalize(entry.title)) ?? null;
    results.push({ entry, tmdb });

    if (!tmdb) {
      const idx = results.length - 1;
      searchPromises.push(
        (async () => {
          try {
            // If we have a year from Letterboxd, search with it
            const year = entry.year || trackingYear;
            const res = await searchMovie(entry.title, year);
            let match = pickBestMatch(res.results, year);

            // If no results with year, retry without year constraint
            if (!match && entry.year) {
              const fallback = await searchMovie(entry.title);
              match = pickBestMatch(fallback.results, entry.year);
            }

            // If year was 0 and we searched with trackingYear but got nothing,
            // try without any year
            if (!match && !entry.year) {
              const fallback = await searchMovie(entry.title);
              match = pickBestMatch(fallback.results, trackingYear);
            }

            if (match) {
              results[idx].tmdb = match;
            }
          } catch {
            // Search failed, leave tmdb as null
          }
        })()
      );
    }
  }

  await Promise.allSettled(searchPromises);
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

    // 3. Build TMDB lookup by normalized title
    const tmdbByTitle = new Map<string, TMDBMovie>();
    for (const m of tmdbMovies) {
      const key = normalize(m.title);
      if (
        !tmdbByTitle.has(key) ||
        m.popularity > (tmdbByTitle.get(key)!.popularity ?? 0)
      ) {
        tmdbByTitle.set(key, m);
      }
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
      year
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
      year
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
