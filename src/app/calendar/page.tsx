"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useMovies } from "@/hooks/use-movies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PosterImage } from "@/components/shared/poster-image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];

  // Pad the start with nulls
  for (let i = 0; i < startPad; i++) {
    days.push(null);
  }

  // Fill actual days
  for (let d = 1; d <= totalDays; d++) {
    days.push(d);
  }

  return days;
}

export default function CalendarPage() {
  const { movies, isLoading } = useMovies();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  const calendarDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  // Build a map of day -> movies for the current month
  const moviesByDay = useMemo(() => {
    const map: Record<number, typeof movies> = {};
    movies.forEach((movie) => {
      if (!movie.releaseDate) return;
      const date = new Date(movie.releaseDate + "T00:00:00");
      if (
        date.getFullYear() === currentYear &&
        date.getMonth() === currentMonth
      ) {
        const day = date.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(movie);
      }
    });
    return map;
  }, [movies, currentYear, currentMonth]);

  const monthMovieCount = useMemo(
    () => Object.values(moviesByDay).reduce((sum, arr) => sum + arr.length, 0),
    [moviesByDay],
  );

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="aspect-[7/5] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Release Calendar</h1>
        <p className="mt-1 text-muted-foreground">
          {monthMovieCount} movie{monthMovieCount !== 1 ? "s" : ""} releasing in{" "}
          {monthLabel}
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">{monthLabel}</h2>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-xl border">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayMovies = day ? moviesByDay[day] || [] : [];
            const hasWatched = dayMovies.some((m) => m.watched);
            const isToday =
              day !== null &&
              currentYear === now.getFullYear() &&
              currentMonth === now.getMonth() &&
              day === now.getDate();

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[80px] border-b border-r p-1 sm:min-h-[100px]",
                  day === null && "bg-muted/20",
                  hasWatched && "border-2 border-green-500/30",
                  isToday && "bg-primary/5",
                )}
              >
                {day !== null && (
                  <>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday &&
                          "bg-primary text-primary-foreground font-bold",
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayMovies.slice(0, 3).map((movie) => (
                        <Link
                          key={movie.tmdbId}
                          href={`/movies/${movie.tmdbId}`}
                          title={movie.title}
                        >
                          <div className="h-10 w-7 overflow-hidden rounded-sm transition-transform hover:scale-110 sm:h-12 sm:w-8">
                            <PosterImage
                              posterPath={movie.posterPath}
                              alt={movie.title}
                              size="sm"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </Link>
                      ))}
                      {dayMovies.length > 3 && (
                        <span className="flex h-10 w-7 items-center justify-center rounded-sm bg-muted text-xs font-medium sm:h-12 sm:w-8">
                          +{dayMovies.length - 3}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
