"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/shared/poster-image";
import { tmdbImageUrl, formatDate } from "@/lib/utils";
import { TMDBMovieDetail } from "@/types/movie";
import { ArrowLeft, Clock, Calendar, ExternalLink } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MovieDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function MovieDetailPage({ params }: MovieDetailPageProps) {
  const { id } = use(params);
  const { data: movie, error, isLoading } = useSWR<TMDBMovieDetail>(
    `/api/tmdb/movie/${id}`,
    fetcher,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="aspect-[21/9] w-full rounded-xl" />
        <div className="flex gap-6">
          <Skeleton className="h-[400px] w-[267px] flex-shrink-0 rounded-lg" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="space-y-4">
        <Link href="/movies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Movies
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {error ? "Failed to load movie details" : "Movie not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const directors =
    movie.credits?.crew?.filter((c) => c.job === "Director").map((c) => c.name) ?? [];
  const cast =
    movie.credits?.cast?.sort((a, b) => a.order - b.order).slice(0, 8).map((c) => c.name) ?? [];
  const genres = movie.genres ?? [];
  const providers = movie["watch/providers"]?.results?.CA;

  return (
    <div className="space-y-6">
      <Link href="/movies">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Movies
        </Button>
      </Link>

      {/* Backdrop */}
      {movie.backdrop_path && (
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl">
          <Image
            src={tmdbImageUrl(movie.backdrop_path, "w1280")}
            alt={`${movie.title} backdrop`}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Poster */}
        <div className="flex-shrink-0">
          <PosterImage
            posterPath={movie.poster_path}
            alt={movie.title}
            size="lg"
            className="mx-auto rounded-lg shadow-lg md:mx-0"
          />
        </div>

        {/* Metadata */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{movie.title}</h1>
            {movie.tagline && (
              <p className="mt-1 text-lg italic text-muted-foreground">
                {movie.tagline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {movie.release_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(movie.release_date)}
              </span>
            )}
            {movie.runtime && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {movie.runtime} min
              </span>
            )}
            {movie.vote_average > 0 && (
              <Badge variant="secondary">
                TMDB {movie.vote_average.toFixed(1)}
              </Badge>
            )}
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <Badge key={g.id} variant="secondary">
                  {g.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Directors */}
          {directors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                {directors.length === 1 ? "Director" : "Directors"}
              </h3>
              <p className="mt-0.5">{directors.join(", ")}</p>
            </div>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                Top Cast
              </h3>
              <p className="mt-0.5">{cast.join(", ")}</p>
            </div>
          )}

          {/* Overview */}
          {movie.overview && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                Overview
              </h3>
              <p className="mt-0.5 leading-relaxed">{movie.overview}</p>
            </div>
          )}

          {/* Streaming providers */}
          {providers?.flatrate && providers.flatrate.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">
                Streaming On
              </h3>
              <div className="mt-1 flex flex-wrap gap-2">
                {providers.flatrate.map((p) => (
                  <div key={p.provider_name} className="flex items-center gap-1.5">
                    <Image
                      src={tmdbImageUrl(p.logo_path, "w92")}
                      alt={p.provider_name}
                      width={24}
                      height={24}
                      className="rounded"
                    />
                    <span className="text-xs">{p.provider_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External links */}
          <div className="flex flex-wrap gap-3 pt-2">
            {movie.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  IMDB
                </Button>
              </a>
            )}
            <a
              href={`https://letterboxd.com/tmdb/${movie.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Letterboxd
              </Button>
            </a>
            <a
              href={`https://www.themoviedb.org/movie/${movie.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                TMDB
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
