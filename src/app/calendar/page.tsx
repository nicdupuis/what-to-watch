"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMovies } from "@/hooks/use-movies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/shared/poster-image";
import { cn, formatDate } from "@/lib/utils";
import { GENRE_MAP, type MovieSummary } from "@/types/movie";
import {
  Clock,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

type FilterMode = "all" | "anticipated" | "popular";

interface MonthGroup {
  key: string;
  label: string;
  movies: MovieSummary[];
  isPast: boolean;
  isCurrent: boolean;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownLabel(days: number): string {
  if (days < 0) return "Released";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days} days`;
  if (days <= 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""}`;
  }
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""}`;
}

export default function CalendarPage() {
  const { movies, isLoading } = useMovies();
  const today = new Date().toISOString().split("T")[0];
  const currentMonthKey = today.substring(0, 7);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    new Set([currentMonthKey])
  );

  // Upcoming countdown: anticipated unreleased movies, nearest first
  const countdownMovies = useMemo(() => {
    return movies
      .filter(
        (m) =>
          m.anticipated &&
          !m.watched &&
          m.releaseDate &&
          m.releaseDate >= today
      )
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
      .slice(0, 5);
  }, [movies, today]);

  // Filter movies
  const filteredMovies = useMemo(() => {
    let result = movies.filter((m) => m.releaseDate);
    if (filter === "anticipated") {
      result = result.filter((m) => m.anticipated || m.source === "anticipated");
    } else if (filter === "popular") {
      result = result.filter(
        (m) =>
          m.source === "watched-list" ||
          m.source === "anticipated" ||
          (m.popularity >= 50 && m.voteCount >= 10)
      );
    }
    return result;
  }, [movies, filter]);

  // Group by month
  const monthGroups: MonthGroup[] = useMemo(() => {
    const groups = new Map<string, MovieSummary[]>();

    for (const movie of filteredMovies) {
      const monthKey = movie.releaseDate.substring(0, 7);
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey)!.push(movie);
    }

    // Sort movies within each month by date
    for (const movies of groups.values()) {
      movies.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, movies]) => {
        const [y, m] = key.split("-").map(Number);
        const label = new Date(y, m - 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        return {
          key,
          label,
          movies,
          isPast: key < currentMonthKey,
          isCurrent: key === currentMonthKey,
        };
      });
  }, [filteredMovies, currentMonthKey]);

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Release Calendar</h1>
        <p className="mt-1 text-muted-foreground">
          Upcoming releases and countdowns for your most anticipated films
        </p>
      </div>

      {/* Countdown Cards */}
      {countdownMovies.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Coming Soon
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {countdownMovies.map((movie) => {
              const days = daysUntil(movie.releaseDate);
              return (
                <Card
                  key={movie.tmdbId}
                  className="overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="flex h-full">
                    <div className="w-16 shrink-0">
                      <PosterImage
                        posterPath={movie.posterPath}
                        backdropPath={movie.backdropPath}
                        alt={movie.title}
                        size="sm"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardContent className="flex flex-col justify-center p-3">
                      <p className="text-sm font-semibold leading-tight">
                        {movie.title}
                      </p>
                      {movie.directors.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {movie.directors.join(", ")}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-bold",
                            days <= 7
                              ? "text-amber-500"
                              : days <= 30
                                ? "text-blue-500"
                                : "text-muted-foreground"
                          )}
                        >
                          {countdownLabel(days)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(movie.releaseDate)}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(
          [
            ["all", "All Releases"],
            ["anticipated", "My Anticipated"],
            ["popular", "Notable Only"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {monthGroups.map((group) => {
          const isCollapsed = !expandedMonths.has(group.key);
          const anticipatedCount = group.movies.filter(
            (m) => m.anticipated || m.source === "anticipated"
          ).length;
          const watchedCount = group.movies.filter((m) => m.watched).length;

          return (
            <div key={group.key}>
              {/* Month Header */}
              <button
                onClick={() => toggleMonth(group.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent/50",
                  group.isCurrent && "bg-primary/5 border border-primary/20",
                  group.isPast && "opacity-60"
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">{group.label}</h3>
                    {group.isCurrent && (
                      <Badge
                        variant="default"
                        className="text-[10px] px-1.5 py-0"
                      >
                        Now
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{group.movies.length} releases</span>
                    {anticipatedCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        {anticipatedCount} anticipated
                      </span>
                    )}
                    {watchedCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-green-500" />
                        {watchedCount} watched
                      </span>
                    )}
                  </div>
                </div>
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Movie List */}
              {!isCollapsed && (
                <div className="ml-2 border-l-2 border-border pl-4 pt-2 pb-4 space-y-2">
                  {group.movies.map((movie) => {
                    const days = daysUntil(movie.releaseDate);
                    const isReleased = days < 0;
                    const genres = (movie.genreIds ?? [])
                      .map((id) => GENRE_MAP[id])
                      .filter(Boolean)
                      .slice(0, 3);

                    return (
                      <Link
                        key={movie.tmdbId}
                        href={`/movies/${movie.tmdbId}`}
                        className="block"
                      >
                        <div
                          className={cn(
                            "flex gap-3 rounded-lg p-2 transition-colors hover:bg-accent/50",
                            movie.watched && "opacity-60"
                          )}
                        >
                          {/* Poster */}
                          <div className="w-12 h-18 shrink-0 overflow-hidden rounded">
                            <PosterImage
                              posterPath={movie.posterPath}
                              backdropPath={movie.backdropPath}
                              alt={movie.title}
                              size="sm"
                              className="h-full w-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">
                                  {movie.title}
                                </p>
                                {movie.directors.length > 0 && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {movie.directors.join(", ")}
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(movie.releaseDate)}
                                </p>
                                {!isReleased && !movie.watched && (
                                  <p
                                    className={cn(
                                      "text-xs font-medium",
                                      days <= 7
                                        ? "text-amber-500"
                                        : days <= 30
                                          ? "text-blue-500"
                                          : "text-muted-foreground"
                                    )}
                                  >
                                    {countdownLabel(days)}
                                  </p>
                                )}
                                {isReleased && movie.voteAverage > 0 && (
                                  <span className="inline-block mt-0.5 rounded bg-amber-500/90 px-1 py-0.5 text-[10px] font-bold text-white leading-none">
                                    {movie.voteAverage.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Tags row */}
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {movie.watched && (
                                <Badge
                                  variant="default"
                                  className="text-[10px] px-1.5 py-0 bg-green-600"
                                >
                                  Watched
                                  {movie.ownerRating
                                    ? ` ${movie.ownerRating}/10`
                                    : ""}
                                </Badge>
                              )}
                              {(movie.anticipated ||
                                movie.source === "anticipated") &&
                                !movie.watched && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-500">
                                    Anticipated
                                  </Badge>
                                )}
                              {genres.map((g) => (
                                <Badge
                                  key={g}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {g}
                                </Badge>
                              ))}
                              {movie.topCast.length > 0 && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {movie.topCast.slice(0, 2).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {monthGroups.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No releases found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try changing the filter to see more movies.
          </p>
        </div>
      )}
    </div>
  );
}
