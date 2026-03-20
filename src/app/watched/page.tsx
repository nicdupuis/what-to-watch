"use client";

import { useState, useMemo } from "react";
import { useMovies } from "@/hooks/use-movies";
import { MovieGrid } from "@/components/movie/movie-grid";
import { Card, CardContent } from "@/components/ui/card";
import { RatingDisplay } from "@/components/shared/rating-display";
import { Select } from "@/components/ui/select";
import type { MovieSummary } from "@/types/movie";
import { Eye, Star } from "lucide-react";

const SORT_OPTIONS = [
  { value: "rating", label: "Highest Rated" },
  { value: "watched_date", label: "Recently Watched" },
  { value: "title", label: "Title (A-Z)" },
];

function sortWatched(movies: MovieSummary[], sortBy: string): MovieSummary[] {
  const sorted = [...movies];
  switch (sortBy) {
    case "rating":
      sorted.sort((a, b) => (b.userRating ?? 0) - (a.userRating ?? 0));
      break;
    case "watched_date":
      sorted.sort((a, b) =>
        (b.watchedDate ?? "").localeCompare(a.watchedDate ?? ""),
      );
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  return sorted;
}

export default function WatchedPage() {
  const { movies, isLoading } = useMovies();
  const [sortBy, setSortBy] = useState("watched_date");

  const watchedMovies = useMemo(
    () => movies.filter((m) => m.watched),
    [movies],
  );

  const sortedMovies = useMemo(
    () => sortWatched(watchedMovies, sortBy),
    [watchedMovies, sortBy],
  );

  const avgRating = useMemo(() => {
    const rated = watchedMovies.filter(
      (m) => m.userRating !== null && m.userRating > 0,
    );
    if (rated.length === 0) return 0;
    return (
      rated.reduce((sum, m) => sum + (m.userRating ?? 0), 0) / rated.length
    );
  }, [watchedMovies]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Watched Movies</h1>
        <p className="mt-1 text-muted-foreground">
          Your viewed 2026 releases
        </p>
      </div>

      {/* Stats summary */}
      {!isLoading && (
        <div className="flex flex-wrap gap-4">
          <Card className="flex-1 min-w-[160px]">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{watchedMovies.length}</p>
                <p className="text-xs text-muted-foreground">Total Watched</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 min-w-[160px]">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {avgRating > 0 ? avgRating.toFixed(1) : "--"}
                </p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
              {avgRating > 0 && (
                <RatingDisplay rating={avgRating} size="sm" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sort control */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Select
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS}
          className="w-48"
        />
      </div>

      <MovieGrid movies={sortedMovies} loading={isLoading} />
    </div>
  );
}
