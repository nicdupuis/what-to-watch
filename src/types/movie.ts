export interface MovieSummary {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string;
  genreIds: number[];
  overview: string;
  voteAverage: number;
  watched: boolean;
  userRating: number | null;
  watchedDate: string | null;
  listRanking: number | null; // position in the user's Letterboxd list
  ownerRating: number | null; // 1-10 rating from ranked Letterboxd list
  letterboxdSlug: string | null;
  source: "watched-list" | "anticipated" | "discover"; // where this movie came from
  anticipated: boolean; // on the user's anticipated list
  directors: string[];
  topCast: string[]; // up to 3 main actors
}

export interface MovieDetail extends MovieSummary {
  runtime: number | null;
  cast: string[];
  streamingProviders: StreamingProvider[];
  backdropPath: string | null;
  tagline: string | null;
  imdbId: string | null;
  letterboxdUrl: string | null;
}

export interface StreamingProvider {
  name: string;
  logoPath: string;
  type: "flatrate" | "rent" | "buy";
}

export interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  genre_ids: number[];
  overview: string;
  vote_average: number;
  backdrop_path: string | null;
  popularity: number;
}

export interface TMDBDiscoverResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMovieDetail {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genre_ids: number[];
  genres: { id: number; name: string }[];
  overview: string;
  vote_average: number;
  runtime: number | null;
  tagline: string | null;
  imdb_id: string | null;
  credits?: {
    crew: { job: string; name: string }[];
    cast: { name: string; order: number }[];
  };
  "watch/providers"?: {
    results?: {
      CA?: {
        flatrate?: { provider_name: string; logo_path: string }[];
        rent?: { provider_name: string; logo_path: string }[];
        buy?: { provider_name: string; logo_path: string }[];
      };
    };
  };
}

export const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};
