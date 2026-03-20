"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
}: {
  movie: ShowtimeMovie;
  watchedTitles: Set<string>;
  anticipatedTitles: Set<string>;
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

          {/* Experiences and sessions */}
          <div className="space-y-2.5">
            {movie.experiences.map((exp, idx) => {
              const expLabel = exp.experienceTypes.length > 0
                ? exp.experienceTypes.join(" + ")
                : "Standard";

              return (
                <div key={idx}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    {expLabel}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {exp.sessions.map((session, sIdx) => (
                      session.isSoldOut ? (
                        <span
                          key={sIdx}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground line-through cursor-not-allowed"
                        >
                          {new Date(session.showStartDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      ) : (
                        <a
                          key={sIdx}
                          href={session.ticketingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          {new Date(session.showStartDateTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
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

  // Cineplex API expects MM/DD/YYYY
  const cineplexDate = selectedDate
    ? `${selectedDate.substring(5, 7)}/${selectedDate.substring(8, 10)}/${selectedDate.substring(0, 4)}`
    : "";

  const { data, isLoading, error } = useSWR<ShowtimeResponse[]>(
    settings.theatreId
      ? `/api/cineplex/showtimes?theatreId=${settings.theatreId}&date=${cineplexDate}`
      : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

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

  // Extract all movies from the response
  const showtimeMovies = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.flatMap((r) => r.dates.flatMap((d) => d.movies));
  }, [data]);

  if (!loaded) return null;

  // No theatre selected
  if (!settings.theatreId) {
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Showtimes</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {settings.theatreName}
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
            className={cn(
              "shrink-0",
              selectedDate === day.value && "shadow-sm"
            )}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            {day.label}
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
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
      {error && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load showtimes. Please try again later.</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && showtimeMovies.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No showtimes found for this date.</p>
          </CardContent>
        </Card>
      )}

      {/* Movie cards */}
      {!isLoading && !error && showtimeMovies.length > 0 && (
        <div className="space-y-4">
          {showtimeMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              watchedTitles={watchedTitles}
              anticipatedTitles={anticipatedTitles}
            />
          ))}
        </div>
      )}
    </div>
  );
}
