"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/shared/poster-image";
import { cn, tmdbImageUrl, formatDate } from "@/lib/utils";
import { Tv, Star, X, ExternalLink, Calendar } from "lucide-react";
import type { TMDBTVShow } from "@/types/tv";
import { TV_GENRE_MAP } from "@/types/tv";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tab = "trending" | "on-the-air" | "top-rated";

const TAB_CONFIG: { key: Tab; label: string; endpoint: string }[] = [
  { key: "trending", label: "Trending", endpoint: "/api/tv/trending" },
  { key: "on-the-air", label: "On The Air", endpoint: "/api/tv/on-the-air" },
  { key: "top-rated", label: "Top Rated", endpoint: "/api/tv/top-rated" },
];

export default function TVShowsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("trending");
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);

  const config = TAB_CONFIG.find((t) => t.key === activeTab)!;
  const { data: shows, isLoading, error } = useSWR<TMDBTVShow[]>(
    config.endpoint,
    fetcher,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Tv className="h-8 w-8" />
          TV Shows
        </h1>
        <p className="mt-1 text-muted-foreground">
          Trending and currently airing shows
        </p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-2">
        {TAB_CONFIG.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Failed to load TV shows. Please try again later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Show grid */}
      {!isLoading && !error && shows && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {shows.map((show) => (
            <TVShowCard
              key={show.id}
              show={show}
              onClick={() => setSelectedShowId(show.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && shows && shows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No TV shows found.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail modal */}
      {selectedShowId !== null && (
        <TVDetailModal
          showId={selectedShowId}
          onClose={() => setSelectedShowId(null)}
        />
      )}
    </div>
  );
}

// --- TV Show Card ---

function TVShowCard({
  show,
  onClick,
}: {
  show: TMDBTVShow;
  onClick: () => void;
}) {
  const year = show.first_air_date
    ? new Date(show.first_air_date).getFullYear()
    : null;
  const genres = show.genre_ids
    .slice(0, 2)
    .map((id) => TV_GENRE_MAP[id])
    .filter(Boolean);
  const hasRating =
    show.vote_average > 0 && show.vote_count > 0 && show.first_air_date;

  return (
    <button
      onClick={onClick}
      className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card className="overflow-hidden h-full transition-shadow hover:shadow-lg">
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <PosterImage
            posterPath={show.poster_path}
            backdropPath={show.backdrop_path}
            alt={show.name}
            size="md"
            className="h-full w-full"
          />
          {/* Rating badge */}
          {hasRating && (
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-yellow-400">
              <Star className="h-3 w-3 fill-yellow-400" />
              {show.vote_average.toFixed(1)}
            </div>
          )}
          {/* Country code */}
          {show.origin_country.length > 0 && (
            <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
              {show.origin_country[0]}
            </div>
          )}
        </div>

        {/* Info */}
        <CardContent className="p-3 space-y-1.5">
          <h3 className="text-sm font-semibold leading-tight line-clamp-2">
            {show.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {year && <span>{year}</span>}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {genres.map((g) => (
                <Badge
                  key={g}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {g}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

// --- TV Detail Modal ---

interface TVDetailData {
  id: number;
  name: string;
  first_air_date: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  homepage: string | null;
  external_ids?: { imdb_id: string | null };
  credits?: {
    cast: { name: string; character: string; order: number }[];
  };
  "watch/providers"?: {
    results?: {
      CA?: {
        flatrate?: { provider_name: string; logo_path: string }[];
        ads?: { provider_name: string; logo_path: string }[];
        free?: { provider_name: string; logo_path: string }[];
      };
    };
  };
}

function TVDetailModal({
  showId,
  onClose,
}: {
  showId: number;
  onClose: () => void;
}) {
  const { data: show, isLoading } = useSWR<TVDetailData>(
    `/api/tv/${showId}`,
    fetcher,
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const cast = show?.credits?.cast
    ?.sort((a, b) => a.order - b.order)
    .slice(0, 5) ?? [];

  const providers = show?.["watch/providers"]?.results?.CA;
  const allProviders = [
    ...(providers?.flatrate ?? []),
    ...(providers?.ads ?? []),
    ...(providers?.free ?? []),
  ];
  // Deduplicate by provider name
  const uniqueProviders = allProviders.filter(
    (p, i, arr) => arr.findIndex((x) => x.provider_name === p.provider_name) === i,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full p-1.5 bg-muted hover:bg-muted/80 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {isLoading && (
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardContent>
        )}

        {show && (
          <CardContent className="p-6 space-y-5">
            {/* Title and rating */}
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <h2 className="text-2xl font-bold">{show.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {show.first_air_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(show.first_air_date)}
                    </span>
                  )}
                  {show.number_of_seasons > 0 && (
                    <span>
                      {show.number_of_seasons} season{show.number_of_seasons !== 1 ? "s" : ""}
                    </span>
                  )}
                  {show.status && (
                    <Badge variant="outline" className="text-xs">
                      {show.status}
                    </Badge>
                  )}
                </div>
              </div>
              {show.vote_average > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-sm font-semibold text-yellow-600 dark:text-yellow-400 shrink-0">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  {show.vote_average.toFixed(1)}
                </div>
              )}
            </div>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {show.genres.map((g) => (
                  <Badge key={g.id} variant="secondary">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Overview */}
            {show.overview && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                  Overview
                </h3>
                <p className="text-sm leading-relaxed">{show.overview}</p>
              </div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                  Top Cast
                </h3>
                <div className="space-y-0.5">
                  {cast.map((c) => (
                    <p key={c.name} className="text-sm">
                      <span className="font-medium">{c.name}</span>
                      {c.character && (
                        <span className="text-muted-foreground">
                          {" "}as {c.character}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Where to Watch */}
            {uniqueProviders.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                  Where to Watch in Canada
                </h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {uniqueProviders.map((p) => (
                    <div
                      key={p.provider_name}
                      className="flex items-center gap-1.5"
                    >
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
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={`https://www.themoviedb.org/tv/${show.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  TMDB
                </Button>
              </a>
              {show.external_ids?.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${show.external_ids.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    IMDB
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
