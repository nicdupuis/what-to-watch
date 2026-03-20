import { TMDBDiscoverResponse, TMDBMovie, TMDBMovieDetail } from "@/types/movie";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

function tmdbFetch(path: string, revalidate: number = 3600) {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is not configured");
  }
  const separator = path.includes("?") ? "&" : "?";
  return fetch(`${BASE_URL}${path}${separator}api_key=${TMDB_API_KEY}`, {
    next: { revalidate },
  });
}

export async function discoverMovies(
  year: number = new Date().getFullYear(),
  page: number = 1,
  sortBy: string = "popularity.desc"
): Promise<TMDBDiscoverResponse> {
  const res = await tmdbFetch(
    `/discover/movie?primary_release_year=${year}&region=CA&sort_by=${sortBy}&page=${page}&include_adult=false`,
    3600
  );
  if (!res.ok) throw new Error(`TMDB discover failed: ${res.status}`);
  return res.json();
}

export async function discoverAllMovies(
  year: number = new Date().getFullYear()
): Promise<TMDBDiscoverResponse["results"]> {
  const first = await discoverMovies(year, 1);
  const allMovies = [...first.results];

  // Fetch remaining pages (cap at 20 pages = ~400 movies to avoid abuse)
  const maxPages = Math.min(first.total_pages, 20);
  const pagePromises = [];
  for (let p = 2; p <= maxPages; p++) {
    pagePromises.push(discoverMovies(year, p));
  }
  const pages = await Promise.all(pagePromises);
  for (const page of pages) {
    allMovies.push(...page.results);
  }

  return allMovies;
}

export async function getMovieBasic(id: number): Promise<TMDBMovie | null> {
  try {
    const res = await tmdbFetch(`/movie/${id}`, 86400);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      title: data.title,
      poster_path: data.poster_path,
      release_date: data.release_date,
      genre_ids: (data.genres ?? []).map((g: { id: number }) => g.id),
      overview: data.overview,
      vote_average: data.vote_average,
      vote_count: data.vote_count ?? 0,
      backdrop_path: data.backdrop_path,
      popularity: data.popularity,
    };
  } catch {
    return null;
  }
}

export async function getMovie(id: number): Promise<TMDBMovieDetail> {
  const res = await tmdbFetch(
    `/movie/${id}?append_to_response=credits,watch/providers`,
    86400
  );
  if (!res.ok) throw new Error(`TMDB movie/${id} failed: ${res.status}`);
  return res.json();
}

export async function getMovieCredits(
  id: number
): Promise<{ directors: string[]; topCast: string[] }> {
  const res = await tmdbFetch(`/movie/${id}/credits`, 86400);
  if (!res.ok) {
    return { directors: [], topCast: [] };
  }
  const data = await res.json();
  const directors = (data.crew ?? [])
    .filter((c: { job: string; name: string }) => c.job === "Director")
    .map((c: { name: string }) => c.name);
  const topCast = (data.cast ?? [])
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
    .slice(0, 3)
    .map((c: { name: string }) => c.name);
  return { directors, topCast };
}

export async function getUpcoming(): Promise<TMDBDiscoverResponse> {
  const res = await tmdbFetch(`/movie/upcoming?region=CA`, 3600);
  if (!res.ok) throw new Error(`TMDB upcoming failed: ${res.status}`);
  return res.json();
}

export async function getRecommendations(
  movieId: number
): Promise<TMDBMovie[]> {
  try {
    const res = await tmdbFetch(`/movie/${movieId}/recommendations`, 86400);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function searchMovie(
  query: string,
  year?: number
): Promise<TMDBDiscoverResponse> {
  const yearParam = year ? `&year=${year}` : "";
  const res = await tmdbFetch(
    `/search/movie?query=${encodeURIComponent(query)}${yearParam}`,
    86400
  );
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  return res.json();
}
