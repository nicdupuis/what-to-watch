"use client";

import { useState, useMemo } from "react";
import { useMovies } from "@/hooks/use-movies";
import { MovieGrid } from "@/components/movie/movie-grid";
import { MovieFiltersBar, type MovieFilters } from "@/components/movie/movie-filters";
import type { MovieSummary } from "@/types/movie";

const defaultFilters: MovieFilters = {
  month: "",
  genre: "",
  watchedFilter: "all",
  sortBy: "popularity",
};

function filterMovies(movies: MovieSummary[], filters: MovieFilters): MovieSummary[] {
  let result = [...movies];

  // Filter by month
  if (filters.month) {
    result = result.filter((m) => {
      if (!m.releaseDate) return false;
      const month = new Date(m.releaseDate).getMonth() + 1;
      return month === parseInt(filters.month, 10);
    });
  }

  // Filter by genre
  if (filters.genre) {
    const genreId = parseInt(filters.genre, 10);
    result = result.filter((m) => m.genreIds.includes(genreId));
  }

  // Filter by watched status
  if (filters.watchedFilter === "watched") {
    result = result.filter((m) => m.watched);
  } else if (filters.watchedFilter === "unwatched") {
    result = result.filter((m) => !m.watched);
  }

  // Sort
  switch (filters.sortBy) {
    case "release_date":
      result.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
      break;
    case "rating":
      result.sort((a, b) => b.voteAverage - a.voteAverage);
      break;
    case "title":
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "popularity":
    default:
      // Keep the original order from the API (sorted by popularity)
      break;
  }

  return result;
}

export default function MoviesPage() {
  const { movies, isLoading } = useMovies();
  const [filters, setFilters] = useState<MovieFilters>(defaultFilters);

  const filteredMovies = useMemo(
    () => filterMovies(movies, filters),
    [movies, filters],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Movies</h1>
        <p className="mt-1 text-muted-foreground">
          Browse all tracked 2026 releases
        </p>
      </div>

      <MovieFiltersBar filters={filters} onFilterChange={setFilters} />

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredMovies.length} of {movies.length} movies
        </p>
      )}

      <MovieGrid movies={filteredMovies} loading={isLoading} />
    </div>
  );
}
