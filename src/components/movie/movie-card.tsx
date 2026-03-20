"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Clapperboard, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { MovieSummary } from "@/types/movie";
import { GENRE_MAP } from "@/types/movie";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/shared/poster-image";
import { WatchedBadge } from "@/components/shared/watched-badge";

export interface MovieCardProps {
  movie: MovieSummary;
}

function MovieCard({ movie }: MovieCardProps) {
  const [flipped, setFlipped] = useState(false);

  const genres = (movie.genreIds ?? [])
    .map((id) => GENRE_MAP[id])
    .filter(Boolean)
    .slice(0, 2);

  return (
    <div
      className="group cursor-pointer [perspective:1000px]"
      onClick={() => setFlipped((f) => !f)}
    >
      <div
        className={cn(
          "relative h-[420px] w-full transition-transform duration-500 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        {/* ── Front ── */}
        <div className="absolute inset-0 rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden [backface-visibility:hidden]">
          <div className="relative">
            <PosterImage
              posterPath={movie.posterPath}
              backdropPath={movie.backdropPath}
              alt={movie.title}
              size="md"
              className="w-full h-[300px] object-cover rounded-b-none"
            />
            {movie.watched && (
              <WatchedBadge
                rating={movie.userRating ?? (movie.ownerRating ? movie.ownerRating / 2 : null)}
              />
            )}
            {movie.source === "watched-list" && movie.ownerRating !== null && (
              <div className="absolute top-2 left-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow">
                {movie.ownerRating}/10
              </div>
            )}
            {movie.anticipated && !movie.watched && (
              <div className="absolute top-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white shadow">
                Anticipated
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-1">
              <h3 className="truncate text-sm font-semibold">{movie.title}</h3>
              {movie.voteAverage > 0 && movie.releaseDate && movie.releaseDate <= new Date().toISOString().split("T")[0] && (
                <span className="shrink-0 rounded bg-amber-500/90 px-1 py-0.5 text-[10px] font-bold text-white leading-none">
                  {movie.voteAverage.toFixed(1)}
                </span>
              )}
            </div>
            {movie.directors.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {movie.directors.join(", ")}
              </p>
            )}
            {movie.releaseDate && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(movie.releaseDate)}
              </p>
            )}
            {genres.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Back ── */}
        <div className="absolute inset-0 rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex h-full flex-col p-4">
            <h3 className="text-sm font-bold leading-tight">{movie.title}</h3>
            {movie.releaseDate && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(movie.releaseDate)}
              </p>
            )}

            {/* Director */}
            {movie.directors.length > 0 && (
              <div className="mt-3 flex items-start gap-1.5">
                <Clapperboard className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="text-xs text-foreground">
                  {movie.directors.join(", ")}
                </p>
              </div>
            )}

            {/* Cast */}
            {movie.topCast.length > 0 && (
              <div className="mt-1.5 flex items-start gap-1.5">
                <Users className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <p className="text-xs text-foreground">
                  {movie.topCast.join(", ")}
                </p>
              </div>
            )}

            {/* Synopsis */}
            {movie.overview && (
              <p className="mt-3 flex-1 overflow-y-auto text-xs leading-relaxed text-muted-foreground">
                {movie.overview}
              </p>
            )}

            {/* Rating & Links */}
            <div className="mt-3 flex items-center gap-2 border-t pt-2">
              {movie.ownerRating !== null && (
                <Badge variant="default" className="text-xs">
                  {movie.ownerRating}/10
                </Badge>
              )}
              {movie.voteAverage > 0 && (
                <Badge variant="secondary" className="text-xs">
                  TMDB {movie.voteAverage.toFixed(1)}
                </Badge>
              )}
              <div className="ml-auto flex gap-1.5">
                {movie.tmdbId > 0 && (
                  <Link
                    href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="View on TMDB"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
                {movie.letterboxdSlug && (
                  <Link
                    href={`https://letterboxd.com/film/${movie.letterboxdSlug}/`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="View on Letterboxd"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                      <path d="M8.29 16.752c-.496-.9-.784-1.932-.784-3.033 0-1.1.288-2.133.784-3.033L3.7 7.723A11.053 11.053 0 0 0 2 13.719c0 2.163.62 4.18 1.7 5.886l4.59-2.853ZM12.044 7.61c1.1 0 2.133.288 3.033.784l2.963-4.59A11.053 11.053 0 0 0 12.044 2.1a11.053 11.053 0 0 0-5.996 1.704l2.963 4.59a6.192 6.192 0 0 1 3.033-.784ZM15.077 10.686a6.192 6.192 0 0 1 .784 3.033c0 1.1-.288 2.133-.784 3.033l4.59 2.963a11.053 11.053 0 0 0 1.704-5.996c0-2.163-.62-4.18-1.704-5.996l-4.59 2.963Z" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { MovieCard };
