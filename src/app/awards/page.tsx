"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { AwardCeremony } from "@/types/awards";
import { Trophy, Award, ChevronDown, ChevronUp, Check } from "lucide-react";

interface FilmScore {
  title: string;
  totalWins: number;
  ceremonies: { shortName: string; color: string; categories: string[] }[];
}

function buildFilmScorecard(ceremonies: AwardCeremony[]): FilmScore[] {
  const filmMap = new Map<
    string,
    { totalWins: number; ceremonies: Map<string, { color: string; categories: string[] }> }
  >();

  for (const ceremony of ceremonies) {
    for (const category of ceremony.categories) {
      if (!category.winner) continue;
      const title = category.winner.title;
      if (!filmMap.has(title)) {
        filmMap.set(title, { totalWins: 0, ceremonies: new Map() });
      }
      const entry = filmMap.get(title)!;
      entry.totalWins += 1;
      if (!entry.ceremonies.has(ceremony.shortName)) {
        entry.ceremonies.set(ceremony.shortName, {
          color: ceremony.color,
          categories: [],
        });
      }
      entry.ceremonies.get(ceremony.shortName)!.categories.push(category.name);
    }
  }

  return Array.from(filmMap.entries())
    .map(([title, data]) => ({
      title,
      totalWins: data.totalWins,
      ceremonies: Array.from(data.ceremonies.entries()).map(
        ([shortName, info]) => ({
          shortName,
          color: info.color,
          categories: info.categories,
        })
      ),
    }))
    .sort((a, b) => b.totalWins - a.totalWins)
    .slice(0, 10);
}

function isPastCeremony(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ceremony = new Date(dateStr + "T00:00:00");
  return ceremony < today;
}

export default function AwardsPage() {
  const [ceremonies, setCeremonies] = useState<AwardCeremony[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCeremonies, setExpandedCeremonies] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetch("/data/awards.json")
      .then((r) => r.json())
      .then((data: AwardCeremony[]) => {
        setCeremonies(data);
        // Expand the most recent past ceremony and any upcoming ones by default
        const expanded = new Set<string>();
        for (const c of data) {
          if (!isPastCeremony(c.date)) {
            expanded.add(c.id);
          }
        }
        // If all are past, expand the last one (Oscars)
        if (expanded.size === 0 && data.length > 0) {
          expanded.add(data[data.length - 1].id);
        }
        setExpandedCeremonies(expanded);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filmScorecard = useMemo(
    () => buildFilmScorecard(ceremonies),
    [ceremonies]
  );

  function toggleCeremony(id: string) {
    setExpandedCeremonies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-80" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-48 w-64 flex-shrink-0 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="h-8 w-8 text-amber-500" />
          Awards Season
        </h1>
        <p className="mt-1 text-muted-foreground">
          Tracking the road to the Oscars
        </p>
      </div>

      {/* Film Scorecard */}
      <section>
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Top Films by Total Wins
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin">
          {filmScorecard.map((film) => (
            <Card
              key={film.title}
              className="flex-shrink-0 w-72 transition-all hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-tight">
                  {film.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Win count */}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-amber-500">
                    {film.totalWins}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {film.totalWins === 1 ? "win" : "wins"}
                  </span>
                </div>

                {/* Ceremony dots */}
                <div className="flex items-center gap-1.5">
                  {film.ceremonies.map((c) => (
                    <div
                      key={c.shortName}
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.color }}
                      title={c.shortName}
                    />
                  ))}
                </div>

                {/* Categories won */}
                <div className="space-y-1">
                  {film.ceremonies.map((c) => (
                    <div key={c.shortName} className="text-xs">
                      <span
                        className="font-semibold"
                        style={{ color: c.color }}
                      >
                        {c.shortName}:
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {c.categories.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Ceremony Timeline */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Ceremony Timeline</h2>
        <div className="space-y-2">
          {ceremonies.map((ceremony) => {
            const past = isPastCeremony(ceremony.date);
            const isExpanded = expandedCeremonies.has(ceremony.id);

            return (
              <div key={ceremony.id}>
                {/* Ceremony Header */}
                <button
                  onClick={() => toggleCeremony(ceremony.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent/50",
                    past && "opacity-70"
                  )}
                >
                  {/* Colored accent bar */}
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: ceremony.color }}
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold">{ceremony.name}</h3>
                      {past && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ceremony.date)}
                    </p>
                  </div>

                  <Badge
                    className="flex-shrink-0"
                    style={{
                      backgroundColor: ceremony.color,
                      color: "#fff",
                      borderColor: "transparent",
                    }}
                  >
                    {ceremony.categories.length}{" "}
                    {ceremony.categories.length === 1
                      ? "category"
                      : "categories"}
                  </Badge>

                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {/* Ceremony Body */}
                {isExpanded && (
                  <div className="ml-6 border-l-2 pl-5 pt-2 pb-4" style={{ borderColor: ceremony.color }}>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {ceremony.categories.map((category) => (
                        <Card
                          key={category.name}
                          className="transition-all hover:shadow-sm"
                        >
                          <CardContent className="p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                              {category.name}
                            </p>
                            {category.winner ? (
                              <div>
                                <p className="text-sm font-bold leading-tight">
                                  {category.winner.title}
                                </p>
                                {category.winner.person && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {category.winner.person}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                TBA
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
