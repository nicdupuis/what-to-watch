"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { Festival } from "@/types/festival";
import { ExternalLink, MapPin, Calendar } from "lucide-react";

function getFestivalStatus(
  festival: Festival,
  today: string,
): "past" | "now" | "upcoming" {
  if (festival.endDate < today) return "past";
  if (festival.startDate <= today && festival.endDate >= today) return "now";
  return "upcoming";
}

function getTimelinePosition(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const yearEnd = new Date(date.getFullYear(), 11, 31);
  const totalMs = yearEnd.getTime() - yearStart.getTime();
  const elapsedMs = date.getTime() - yearStart.getTime();
  return (elapsedMs / totalMs) * 100;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function FestivalsPage() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/festivals.json")
      .then((r) => r.json())
      .then((data: Festival[]) => {
        setFestivals(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayPosition = getTimelinePosition(today);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Film Festivals</h1>
        <p className="mt-1 text-muted-foreground">
          Major film festivals of 2026
        </p>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="py-6">
          <div className="relative">
            {/* Month labels */}
            <div className="flex justify-between px-1 text-xs text-muted-foreground mb-3">
              {MONTH_LABELS.map((label) => (
                <span key={label} className="w-0 text-center">
                  {label}
                </span>
              ))}
            </div>

            {/* Timeline bar */}
            <div className="relative h-12 rounded-full bg-muted">
              {/* Today marker */}
              <div
                className="absolute top-0 h-full w-0.5 bg-primary z-10"
                style={{ left: `${todayPosition}%` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary">
                  Today
                </span>
              </div>

              {/* Festival blocks */}
              {festivals.map((festival) => {
                const left = getTimelinePosition(festival.startDate);
                const right = getTimelinePosition(festival.endDate);
                const width = Math.max(right - left, 1);
                const status = getFestivalStatus(festival, today);

                return (
                  <div
                    key={festival.id}
                    className={cn(
                      "absolute top-1 h-10 rounded-full transition-opacity",
                      status === "past" && "opacity-40",
                    )}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: festival.color,
                      minWidth: "8px",
                    }}
                    title={`${festival.name} (${formatDate(festival.startDate)} - ${formatDate(festival.endDate)})`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Festival Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {festivals.map((festival) => {
          const status = getFestivalStatus(festival, today);

          return (
            <Card
              key={festival.id}
              className={cn(
                "transition-all",
                status === "past" && "opacity-60",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {festival.name}
                  </CardTitle>
                  {status === "now" && (
                    <Badge
                      className="flex-shrink-0"
                      style={{
                        backgroundColor: festival.color,
                        color: "#fff",
                      }}
                    >
                      Now
                    </Badge>
                  )}
                  {status === "upcoming" && (
                    <Badge variant="secondary" className="flex-shrink-0">
                      Upcoming
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{festival.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {formatDate(festival.startDate)} &ndash;{" "}
                    {formatDate(festival.endDate)}
                  </span>
                </div>
                <a
                  href={festival.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Official Website
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
