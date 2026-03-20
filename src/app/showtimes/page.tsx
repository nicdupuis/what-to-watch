"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSettings, SavedTheatre } from "@/hooks/use-settings";
import { useMovies } from "@/hooks/use-movies";
import { MapPin, Clock, Ticket, ExternalLink, Calendar } from "lucide-react";

interface ShowtimeSession {
  ticketingUrl: string;
  showStartDateTime: string;
  isSoldOut: boolean;
  auditorium: string;
  seatsRemaining: number;
}

interface Experience {
  experienceTypes: string[];
  sessions: ShowtimeSession[];
}

interface ShowtimeMovie {
  id: string;
  name: string;
  filmUrl: string;
  runtimeInMinutes: number;
  smallPosterImageUrl: string;
  mediumPosterImageUrl: string;
  largePosterImageUrl: string;
  genres: string[];
  isEvent: boolean;
  experiences: Experience[];
}

interface ShowtimeDate {
  startDate: string;
  movies: ShowtimeMovie[];
}

interface ShowtimeResponse {
  theatre: string;
  theatreId: string;
  dates: ShowtimeDate[];
}

// A merged movie across theatres, grouped by movie name
interface MergedMovie {
  id: string;
  name: string;
  filmUrl: string;
  runtimeInMinutes: number;
  smallPosterImageUrl: string;
  mediumPosterImageUrl: string;
  largePosterImageUrl: string;
  genres: string[];
  isEvent: boolean;
  theatreShowtimes: {
    theatreId: number;
    theatreName: string;
    experiences: Experience[];
  }[];
}

interface TheatreShowtimeResult {
  theatreId: number;
  theatreName: string;
  data: ShowtimeResponse[] | null;
  error: string | null;
  isLoading: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function useMultiTheatreShowtimes(
  theatres: SavedTheatre[],
  cineplexDate: string
): { results: TheatreShowtimeResult[]; anyLoading: boolean; allError: boolean } {
  const [results, setResults] = useState<TheatreShowtimeResult[]>([]);
  const [anyLoading, setAnyLoading] = useState(false);

  const theatreKey = theatres.map((t) => t.id).join(",");

  const fetchAll = useCallback(async () => {
    if (theatres.length === 0 || !cineplexDate) {
      setResults([]);
      setAnyLoading(false);
      return;
    }

    setAnyLoading(true);

    // Initialize loading state for all theatres
    setResults(
      theatres.map((t) => ({
        theatreId: t.id,
        theatreName: t.name,
        data: null,
        error: null,
        isLoading: true,
      }))
    );

    const promises = theatres.map(async (t) => {
      try {
        const url = `/api/cineplex/showtimes?theatreId=${t.id}&date=${cineplexDate}`;
        const data = await fetcher(url);
        return { theatreId: t.id, theatreName: t.name, data, error: null, isLoading: false };
      } catch (err) {
        return {
          theatreId: t.id,
          theatreName: t.name,
          data: null,
          error: err instanceof Error ? err.message : "Failed to load",
          isLoading: false,
        };
      }
    });

    const settled = await Promise.allSettled(promises);
    const finalResults = settled.map((result) => {
      if (result.status === "fulfilled") return result.value;
      return {
        theatreId: 0,
        theatreName: "",
        data: null,
        error: "Request failed",
        isLoading: false,
      };
    });

    setResults(finalResults);
    setAnyLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theatreKey, cineplexDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const allError = results.length > 0 && results.every((r) => r.error !== null);

  return { results, anyLoading, allError };
}

function getNextDays(count: number): { label: string; value: string; isToday: boolean }[] {
  const days: { label: string; value: string; isToday: boolean }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split("T")[0];
    let label: string;
    if (i === 0) label = "Today";
    else if (i === 1) label = "Tomorrow";
    else
      label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    days.push({ label, value, isToday: i === 0 });
  }
  return days;
}

function MovieCard({
  movie,
  watchedTitles,
  anticipatedTitles,
  multiTheatre,
}: {
  movie: MergedMovie;
  watchedTitles: Set<string>;
  anticipatedTitles: Set<string>;
  multiTheatre: boolean;
}) {
  const normalizedName = movie.name.toLowerCase().trim();
  const isWatched = watchedTitles.has(normalizedName);
  const isAnticipated = anticipatedTitles.has(normalizedName);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Poster */}
        <div className="sm:w-32 sm:min-w-[128px] shrink-0">
          {movie.mediumPosterImageUrl ? (
            <img
              src={movie.mediumPosterImageUrl}
              alt={movie.name}
              className="w-full sm:h-full object-cover max-h-48 sm:max-h-none"
            />
          ) : (
            <div className="w-full h-48 sm:h-full bg-muted flex items-center justify-center">
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3">
          <div>
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="text-lg font-semibold leading-tight">{movie.name}</h3>
              {isWatched && (
                <Badge variant="secondary" className="shrink-0">
                  Watched
                </Badge>
              )}
              {isAnticipated && !isWatched && (
                <Badge className="shrink-0 bg-amber-500/90 hover:bg-amber-500 text-white border-0">
                  Anticipated
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              {movie.runtimeInMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {Math.floor(movie.runtimeInMinutes / 60)}h {movie.runtimeInMinutes % 60}m
                </span>
              )}
            </div>

            {movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {movie.genres.map((genre) => (
                  <Badge key={genre} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Theatre-grouped showtimes */}
          <div className="space-y-3">
            {movie.theatreShowtimes.map((ts) => (
              <div key={ts.theatreId}>
                {multiTheatre && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {ts.theatreName}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {ts.experiences.map((exp, idx) => {
                    const expLabel =
                      exp.experienceTypes.length > 0
                        ? exp.experienceTypes.join(" + ")
                        : "Standard";

                    return (
                      <div key={idx}>
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                          {expLabel}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {exp.sessions.map((session, sIdx) =>
                            session.isSoldOut ? (
                              <span
                                key={sIdx}
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground line-through cursor-not-allowed"
                              >
                                {new Date(session.showStartDateTime).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              <a
                                key={sIdx}
                                href={session.ticketingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                {new Date(session.showStartDateTime).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ShowtimesPage() {
  const { settings, loaded } = useSettings();
  const { movies } = useMovies();
  const days = useMemo(() => getNextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(days[0]?.value ?? "");

  // Resolve saved theatres (with backwards compatibility)
  const allTheatres = useMemo<SavedTheatre[]>(() => {
    if (settings.savedTheatres.length > 0) return settings.savedTheatres;
    if (settings.theatreId && settings.theatreName) {
      return [{ id: settings.theatreId, name: settings.theatreName }];
    }
    return [];
  }, [settings.savedTheatres, settings.theatreId, settings.theatreName]);

  // Track which theatres are actively selected for display (multi-select toggle)
  const [activeTheatreIds, setActiveTheatreIds] = useState<number[]>([]);

  // Initialize active theatres when settings load
  const [theatresInitialized, setTheatresInitialized] = useState(false);
  if (loaded && allTheatres.length > 0 && !theatresInitialized) {
    setActiveTheatreIds(allTheatres.map((t) => t.id));
    setTheatresInitialized(true);
  }

  const activeTheatres = useMemo(
    () => allTheatres.filter((t) => activeTheatreIds.includes(t.id)),
    [allTheatres, activeTheatreIds]
  );

  // Cineplex API expects MM/DD/YYYY
  const cineplexDate = selectedDate
    ? `${selectedDate.substring(5, 7)}/${selectedDate.substring(8, 10)}/${selectedDate.substring(0, 4)}`
    : "";

  const { results, anyLoading, allError } = useMultiTheatreShowtimes(activeTheatres, cineplexDate);

  // Build lookup sets for cross-referencing user movie data
  const watchedTitles = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      if (m.watched) set.add(m.title.toLowerCase().trim());
    });
    return set;
  }, [movies]);

  const anticipatedTitles = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      if (m.anticipated) set.add(m.title.toLowerCase().trim());
    });
    return set;
  }, [movies]);

  // Merge movies across all theatre responses, grouped by movie name
  const mergedMovies = useMemo<MergedMovie[]>(() => {
    const movieMap = new Map<string, MergedMovie>();

    for (const result of results) {
      if (!result.data) continue;
      const allMovies = Array.isArray(result.data)
        ? result.data.flatMap((r) => r.dates.flatMap((d) => d.movies))
        : [];

      for (const movie of allMovies) {
        const key = movie.name.toLowerCase().trim();
        const existing = movieMap.get(key);
        if (existing) {
          existing.theatreShowtimes.push({
            theatreId: result.theatreId,
            theatreName: result.theatreName,
            experiences: movie.experiences,
          });
        } else {
          movieMap.set(key, {
            id: movie.id,
            name: movie.name,
            filmUrl: movie.filmUrl,
            runtimeInMinutes: movie.runtimeInMinutes,
            smallPosterImageUrl: movie.smallPosterImageUrl,
            mediumPosterImageUrl: movie.mediumPosterImageUrl,
            largePosterImageUrl: movie.largePosterImageUrl,
            genres: movie.genres,
            isEvent: movie.isEvent,
            theatreShowtimes: [
              {
                theatreId: result.theatreId,
                theatreName: result.theatreName,
                experiences: movie.experiences,
              },
            ],
          });
        }
      }
    }

    return Array.from(movieMap.values());
  }, [results]);

  function toggleTheatre(id: number) {
    setActiveTheatreIds((prev) => {
      if (prev.includes(id)) {
        // Don't allow deselecting all theatres
        if (prev.length <= 1) return prev;
        return prev.filter((tid) => tid !== id);
      }
      return [...prev, id];
    });
  }

  if (!loaded) return null;

  // No theatres saved
  if (allTheatres.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-16 space-y-4">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">No Theatre Selected</h1>
          <p className="text-muted-foreground">
            Pick a theatre in Settings to see what&apos;s playing.
          </p>
          <Link href="/settings">
            <Button className="mt-2">Go to Settings</Button>
          </Link>
        </div>
      </div>
    );
  }

  const multiTheatreActive = activeTheatres.length > 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Showtimes</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {activeTheatres.length === 1
            ? activeTheatres[0].name
            : `${activeTheatres.length} theatres`}
        </p>
      </div>

      {/* Date picker */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <Button
            key={day.value}
            variant={selectedDate === day.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDate(day.value)}
            className={cn("shrink-0", selectedDate === day.value && "shadow-sm")}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            {day.label}
          </Button>
        ))}
      </div>

      {/* Theatre selector (only show if more than one saved theatre) */}
      {allTheatres.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allTheatres.map((theatre) => {
            const isActive = activeTheatreIds.includes(theatre.id);
            return (
              <Button
                key={theatre.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => toggleTheatre(theatre.id)}
                className={cn("shrink-0", isActive && "shadow-sm")}
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                {theatre.name}
              </Button>
            );
          })}
        </div>
      )}

      {/* Loading state */}
      {anyLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex">
                <Skeleton className="w-32 h-48" />
                <div className="flex-1 p-4 space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {allError && !anyLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load showtimes. Please try again later.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!anyLoading && !allError && mergedMovies.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No showtimes found for this date.</p>
          </CardContent>
        </Card>
      )}

      {/* Movie cards */}
      {!anyLoading && !allError && mergedMovies.length > 0 && (
        <div className="space-y-4">
          {mergedMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              watchedTitles={watchedTitles}
              anticipatedTitles={anticipatedTitles}
              multiTheatre={multiTheatreActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
