"use client";

import { useState, useMemo } from "react";
import { useMovies } from "@/hooks/use-movies";
import { MovieGrid } from "@/components/movie/movie-grid";
import {
  MovieFiltersBar,
  type MovieFilters,
} from "@/components/movie/movie-filters";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { MovieSummary } from "@/types/movie";

const defaultFilters: MovieFilters = {
  month: "",
  genre: "",
  watchedFilter: "all",
  sortBy: "list_ranking",
  sourceFilter: "all",
};

function filterMovies(
  movies: MovieSummary[],
  filters: MovieFilters
): MovieSummary[] {
  let result = [...movies];

  // Filter by source
  if (filters.sourceFilter !== "all") {
    result = result.filter((m) => m.source === filters.sourceFilter);
  }

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
    case "list_ranking":
      result.sort((a, b) => {
        // Watched list first (by ranking), then anticipated, then discover
        const sourceOrder = { "watched-list": 0, anticipated: 1, discover: 2 };
        const aSrc = sourceOrder[a.source] ?? 2;
        const bSrc = sourceOrder[b.source] ?? 2;
        if (aSrc !== bSrc) return aSrc - bSrc;
        if (a.source === "watched-list" && b.source === "watched-list") {
          return (a.listRanking ?? 999) - (b.listRanking ?? 999);
        }
        return 0;
      });
      break;
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
      break;
  }

  return result;
}

export default function MoviesPage() {
  const { movies, isLoading, mutate } = useMovies();
  const [filters, setFilters] = useState<MovieFilters>(defaultFilters);
  const [refreshing, setRefreshing] = useState(false);

  const filteredMovies = useMemo(
    () => filterMovies(movies, filters),
    [movies, filters]
  );

  const watchedCount = movies.filter((m) => m.source === "watched-list").length;
  const anticipatedCount = movies.filter((m) => m.source === "anticipated").length;
  const discoverCount = movies.filter((m) => m.source === "discover").length;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      // Bust the server cache by adding a timestamp
      await mutate();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Movies</h1>
          <p className="mt-1 text-muted-foreground">
            {watchedCount} watched, {anticipatedCount} anticipated, {discoverCount} to discover
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
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
