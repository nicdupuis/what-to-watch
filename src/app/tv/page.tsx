"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, tmdbImageUrl } from "@/lib/utils";
import { TV_GENRE_MAP, type TMDBTVShow } from "@/types/tv";
import { Tv, X, ExternalLink, Clock, Star, TrendingUp, Compass } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Tab = "trending" | "discover";

function ShowCard({
  show,
  onClick,
}: {
  show: TMDBTVShow;
  onClick: () => void;
}) {
  const genres = (show.genre_ids ?? [])
    .map((id) => TV_GENRE_MAP[id])
    .filter(Boolean)
    .slice(0, 2);
  const year = show.first_air_date?.substring(0, 4) ?? "";

  return (
    <div className="cursor-pointer" onClick={onClick}>
      <Card className="h-[380px] overflow-hidden transition-all hover:shadow-md hover:scale-[1.02]">
        <div className="relative h-[280px]">
          {show.poster_path ? (
            <Image
              src={tmdbImageUrl(show.poster_path, "w500")}
              alt={show.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted">
              <Tv className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}
          {show.vote_average > 0 && show.vote_count > 0 && (
            <span className="absolute top-2 right-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-xs font-bold text-white shadow">
              {show.vote_average.toFixed(1)}
            </span>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-semibold">{show.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{year}</p>
          {genres.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
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
    </div>
  );
}

function ShowDetailModal({
  show,
  onClose,
}: {
  show: TMDBTVShow;
  onClose: () => void;
}) {
  const { data: detail } = useSWR(
    `/api/tv/${show.id}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const genres = detail?.genres?.map((g: { name: string }) => g.name) ?? [];
  const cast =
    detail?.credits?.cast
      ?.slice(0, 6)
      .map((c: { name: string; character: string }) => ({
        name: c.name,
        character: c.character,
      })) ?? [];

  const caProviders = detail?.["watch/providers"]?.results?.CA;
  const streaming = [
    ...(caProviders?.flatrate ?? []),
    ...(caProviders?.ads ?? []),
    ...(caProviders?.free ?? []),
  ];
  const uniqueProviders = streaming.filter(
    (p: { provider_name: string }, i: number, arr: { provider_name: string }[]) =>
      arr.findIndex((x) => x.provider_name === p.provider_name) === i
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <Card
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1 hover:bg-background"
        >
          <X className="h-4 w-4" />
        </button>

        {show.backdrop_path && (
          <div className="relative h-48 w-full">
            <Image
              src={tmdbImageUrl(show.backdrop_path, "w780")}
              alt={show.name}
              fill
              className="object-cover rounded-t-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
          </div>
        )}

        <CardContent className="p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold">{show.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {show.first_air_date && (
                <span>{show.first_air_date.substring(0, 4)}</span>
              )}
              {detail?.number_of_seasons && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {detail.number_of_seasons} season{detail.number_of_seasons > 1 ? "s" : ""}
                </span>
              )}
              {detail?.status && (
                <Badge variant={detail.status === "Returning Series" ? "default" : "secondary"} className="text-xs">
                  {detail.status}
                </Badge>
              )}
              {show.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                  {show.vote_average.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g: string) => (
                <Badge key={g} variant="outline" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {show.overview && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {show.overview}
            </p>
          )}

          {cast.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Cast
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {cast.map((c: { name: string; character: string }) => (
                  <div key={c.name} className="text-xs">
                    <span className="font-medium">{c.name}</span>
                    {c.character && (
                      <span className="text-muted-foreground"> as {c.character}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {uniqueProviders.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Where to Watch in Canada
              </h3>
              <div className="flex flex-wrap gap-2">
                {uniqueProviders.map((p: { provider_name: string; logo_path: string }) => (
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

          <div className="flex gap-2 pt-1">
            <a
              href={`https://www.themoviedb.org/tv/${show.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                TMDB
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TVPage() {
  const [tab, setTab] = useState<Tab>("trending");
  const [selectedShow, setSelectedShow] = useState<TMDBTVShow | null>(null);

  const { data: trendingData, isLoading: trendingLoading } = useSWR<TMDBTVShow[]>(
    tab === "trending" ? "/api/tv/trending" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { data: discoverData, isLoading: discoverLoading } = useSWR<TMDBTVShow[]>(
    tab === "discover" ? "/api/tv/discover" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const isLoading = tab === "trending" ? trendingLoading : discoverLoading;
  const rawShows = tab === "trending" ? trendingData : discoverData;

  // Filter out anime (Japanese animation)
  const filtered = (rawShows ?? []).filter((s) => {
    const isAnimation = (s.genre_ids ?? []).includes(16);
    const isJapanese = (s.origin_country ?? []).includes("JP");
    return !(isAnimation && isJapanese);
  });

  // Trending: top 15. Discover: top 20.
  const shows = filtered.slice(0, tab === "trending" ? 15 : 20);

  const closeModal = useCallback(() => setSelectedShow(null), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">TV Shows</h1>
        <p className="mt-1 text-muted-foreground">
          {tab === "trending"
            ? "Top 15 trending shows this week"
            : "Popular new and ongoing shows (2025+)"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "trending" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("trending")}
        >
          <TrendingUp className="mr-1.5 h-4 w-4" />
          Trending
        </Button>
        <Button
          variant={tab === "discover" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("discover")}
        >
          <Compass className="mr-1.5 h-4 w-4" />
          Discover
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Card key={i} className="h-[380px] overflow-hidden">
              <Skeleton className="h-[280px] w-full" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Grid */}
      {!isLoading && shows.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {shows.map((show) => (
            <ShowCard
              key={show.id}
              show={show}
              onClick={() => setSelectedShow(show)}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && shows.length === 0 && (
        <div className="py-16 text-center">
          <Tv className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No shows found.</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedShow && (
        <ShowDetailModal show={selectedShow} onClose={closeModal} />
      )}
    </div>
  );
}
