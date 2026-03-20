"use client";

import { useState } from "react";
import Link from "next/link";
import { useMovies } from "@/hooks/use-movies";
import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/shared/poster-image";
import { RatingDisplay } from "@/components/shared/rating-display";
import { formatDate } from "@/lib/utils";
import {
  Film,
  Eye,
  BarChart3,
  Star,
  Calendar,
  Settings,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function HomePage() {
  const { settings, isConfigured, loaded } = useSettings();
  const { movies, isLoading, mutate } = useMovies();
  const [refreshing, setRefreshing] = useState(false);

  if (!loaded) return null;

  if (!isConfigured) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Card className="max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Welcome to What To Watch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set up your Letterboxd username to start tracking 2026 Oscar
              contenders.
            </p>
            <Link href="/settings">
              <Button className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Go to Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const watchedListMovies = movies.filter((m) => m.source === "watched-list");
  const anticipatedMovies = movies.filter((m) => m.source === "anticipated");
  const discoverMovies = movies.filter((m) => m.source === "discover");
  const watchedMovies = movies.filter((m) => m.watched);
  const watchedCount = watchedMovies.length;
  const anticipatedCount = anticipatedMovies.length;
  const totalTracked = watchedListMovies.length + anticipatedCount;
  const completionPct =
    totalTracked > 0 ? Math.round((watchedCount / totalTracked) * 100) : 0;

  async function handleRefresh() {
    setRefreshing(true);
    try { await mutate(); } finally { setRefreshing(false); }
  }
  const avgRating =
    watchedMovies.filter((m) => m.userRating !== null && m.userRating > 0)
      .length > 0
      ? watchedMovies
          .filter((m) => m.userRating !== null && m.userRating > 0)
          .reduce((sum, m) => sum + (m.userRating ?? 0), 0) /
        watchedMovies.filter((m) => m.userRating !== null && m.userRating > 0)
          .length
      : 0;

  const upcoming = movies
    .filter(
      (m) =>
        !m.watched &&
        m.releaseDate > today &&
        (m.source === "anticipated" || m.anticipated || m.popularity >= 50)
    )
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .slice(0, 5);

  const recentlyWatched = watchedListMovies
    .sort((a, b) => (b.ownerRating ?? 0) - (a.ownerRating ?? 0))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Your 2026 Oscar season at a glance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/movies?source=watched-list">
            <Card className="transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Watched
                </CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{watchedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  ranked on your list
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/movies?source=anticipated">
            <Card className="transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Anticipated
                </CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{anticipatedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +{discoverMovies.length} to discover
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completion
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionPct}%</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Rating
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgRating > 0 ? avgRating.toFixed(1) : "--"}
              </div>
              {avgRating > 0 && (
                <RatingDisplay rating={avgRating} size="sm" className="mt-1" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming This Month */}
      {upcoming.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Releases</h2>
            <Link href="/calendar">
              <Button variant="ghost" size="sm">
                View Calendar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {upcoming.map((movie) => (
              <Link
                key={movie.tmdbId}
                href={`/movies/${movie.tmdbId}`}
                className="flex-shrink-0"
              >
                <Card className="w-36 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md">
                  <PosterImage
                    posterPath={movie.posterPath}
                    alt={movie.title}
                    size="sm"
                    className="w-full rounded-b-none"
                  />
                  <CardContent className="p-2">
                    <p className="truncate text-xs font-medium">
                      {movie.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(movie.releaseDate)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Your Ranked Films */}
      {recentlyWatched.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Ranked Films</h2>
            <Link href="/movies?source=watched-list">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentlyWatched.map((movie) => (
              <Link
                key={movie.tmdbId}
                href={`/movies/${movie.tmdbId}`}
                className="flex-shrink-0"
              >
                <Card className="w-36 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md">
                  <PosterImage
                    posterPath={movie.posterPath}
                    alt={movie.title}
                    size="sm"
                    className="w-full rounded-b-none"
                  />
                  <CardContent className="p-2">
                    <p className="truncate text-xs font-medium">
                      {movie.title}
                    </p>
                    {movie.userRating !== null && movie.userRating > 0 && (
                      <RatingDisplay
                        rating={movie.userRating}
                        size="sm"
                        className="mt-1"
                      />
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/movies">
            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
              <Film className="h-5 w-5" />
              <span>All Movies</span>
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
              <Calendar className="h-5 w-5" />
              <span>Calendar</span>
            </Button>
          </Link>
          <Link href="/festivals">
            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
              <Star className="h-5 w-5" />
              <span>Festivals</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
