"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { MovieSummary } from "@/types/movie";
import { GENRE_MAP } from "@/types/movie";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/shared/poster-image";
import { WatchedBadge } from "@/components/shared/watched-badge";

export interface MovieCardProps {
  movie: MovieSummary;
}

function MovieCard({ movie }: MovieCardProps) {
  const genres = movie.genreIds
    .map((id) => GENRE_MAP[id])
    .filter(Boolean)
    .slice(0, 2);

  return (
    <Link href={`/movies/${movie.tmdbId}`}>
      <Card
        className={cn(
          "group overflow-hidden transition-all duration-200",
          "hover:scale-[1.02] hover:shadow-md",
        )}
      >
        <div className="relative">
          <PosterImage
            posterPath={movie.posterPath}
            alt={movie.title}
            size="md"
            className="w-full rounded-b-none"
          />
          {movie.watched && <WatchedBadge rating={movie.userRating} />}
          {movie.source === "list" && movie.listRanking && (
            <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
              {movie.listRanking}
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-semibold">{movie.title}</h3>
          {movie.releaseDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(movie.releaseDate)}
            </p>
          )}
          {movie.ownerRating !== null && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ranked: {movie.ownerRating}/10
            </p>
          )}
          {genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {genres.map((genre) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export { MovieCard };
