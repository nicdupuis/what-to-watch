"use client";

import type { MovieSummary } from "@/types/movie";
import { MovieCard } from "@/components/movie/movie-card";
import { MovieGridSkeleton } from "@/components/shared/loading-skeleton";

export interface MovieGridProps {
  movies: MovieSummary[];
  loading?: boolean;
}

function MovieGrid({ movies, loading = false }: MovieGridProps) {
  if (loading) {
    return <MovieGridSkeleton />;
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No movies found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your filters to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((movie) => (
        <MovieCard key={movie.tmdbId} movie={movie} />
      ))}
    </div>
  );
}

export { MovieGrid };
