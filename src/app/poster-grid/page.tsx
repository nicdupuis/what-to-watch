"use client";

import { useState, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { useMovies } from "@/hooks/use-movies";
import { useSettings } from "@/hooks/use-settings";
import { tmdbImageUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Image, Star, Film } from "lucide-react";

function getGridConfig(count: number): { cols: number; rows: number } {
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 16) return { cols: 4, rows: 4 };
  return { cols: 5, rows: 5 };
}

export default function PosterGridPage() {
  const { movies, isLoading } = useMovies();
  const { settings, loaded } = useSettings();
  const gridRef = useRef<HTMLDivElement>(null);

  const [showTitles, setShowTitles] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [includeAnticipated, setIncludeAnticipated] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const watchedMovies = movies
    .filter((m) => m.source === "watched-list")
    .sort((a, b) => (b.ownerRating ?? 0) - (a.ownerRating ?? 0));

  const anticipatedMovies = movies
    .filter((m) => m.source === "anticipated")
    .sort((a, b) => b.popularity - a.popularity);

  const gridMovies = includeAnticipated
    ? [...watchedMovies, ...anticipatedMovies]
    : watchedMovies;

  const { cols, rows } = getGridConfig(gridMovies.length);
  const maxMovies = cols * rows;
  const displayMovies = gridMovies.slice(0, maxMovies);

  const headerHeight = 64;
  const footerHeight = 48;
  const gridSize = 1080 - headerHeight - footerHeight;

  const handleDownload = useCallback(async () => {
    if (!gridRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(gridRef.current, {
        width: 1080,
        height: 1080,
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `my-2026-movies-${settings.letterboxdUsername}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
    } finally {
      setDownloading(false);
    }
  }, [settings.letterboxdUsername]);

  if (!loaded) return null;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="text-center space-y-4">
          <Image className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading your movies...</p>
        </div>
      </div>
    );
  }

  if (watchedMovies.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6 space-y-4">
            <Film className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-lg font-semibold">No watched movies yet</p>
            <p className="text-sm text-muted-foreground">
              Watch and rank some movies on Letterboxd, then come back to
              generate your poster grid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Share2 className="h-7 w-7" />
          Poster Grid
        </h1>
        <p className="mt-1 text-muted-foreground">
          Generate a shareable collage of your ranked movies
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showTitles}
                onChange={(e) => setShowTitles(e.target.checked)}
                className="rounded border-input"
              />
              Show titles
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showRatings}
                onChange={(e) => setShowRatings(e.target.checked)}
                className="rounded border-input"
              />
              Show ratings
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAnticipated}
                onChange={(e) => setIncludeAnticipated(e.target.checked)}
                className="rounded border-input"
              />
              Include anticipated
            </label>

            <div className="ml-auto">
              <Button onClick={handleDownload} disabled={downloading}>
                <Download className="mr-2 h-4 w-4" />
                {downloading ? "Generating..." : "Download PNG"}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary">
              {displayMovies.length} of {gridMovies.length} movies shown
            </Badge>
            <Badge variant="outline">{cols}x{rows} grid</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Grid preview — scrollable container */}
      <div className="overflow-auto rounded-xl border shadow-lg">
        <div
          ref={gridRef}
          style={{
            width: 1080,
            height: 1080,
            position: "relative",
            backgroundColor: "#0f0f0f",
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              height: headerHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              My 2026 Movies
            </span>
            {settings.letterboxdUsername && (
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                @{settings.letterboxdUsername}
              </span>
            )}
          </div>

          {/* Poster grid */}
          <div
            style={{
              height: gridSize,
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
              gap: 2,
              padding: 2,
            }}
          >
            {displayMovies.map((movie, index) => {
              const cellWidth = Math.floor((1080 - 2 * 2 - (cols - 1) * 2) / cols);
              const cellHeight = Math.floor(
                (gridSize - 2 * 2 - (rows - 1) * 2) / rows
              );
              return (
                <div
                  key={movie.tmdbId}
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    backgroundColor: "#1e1e1e",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tmdbImageUrl(movie.posterPath, "w500")}
                    alt={movie.title}
                    crossOrigin="anonymous"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />

                  {/* Rank badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      backgroundColor: "rgba(0,0,0,0.75)",
                      color: "#fff",
                      fontSize: cellWidth < 200 ? 11 : 13,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    #{index + 1}
                  </div>

                  {/* Rating badge */}
                  {showRatings &&
                    movie.ownerRating !== null &&
                    movie.ownerRating > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          backgroundColor: "rgba(234,179,8,0.9)",
                          color: "#000",
                          fontSize: cellWidth < 200 ? 11 : 13,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {movie.ownerRating}/10
                      </div>
                    )}

                  {/* Title overlay */}
                  {showTitles && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background:
                          "linear-gradient(transparent, rgba(0,0,0,0.85))",
                        padding: `${cellHeight < 200 ? 6 : 12}px 6px 6px`,
                      }}
                    >
                      <span
                        style={{
                          color: "#fff",
                          fontSize: cellWidth < 200 ? 10 : 13,
                          fontWeight: 600,
                          lineHeight: 1.2,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {movie.title}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer bar */}
          <div
            style={{
              height: footerHeight,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              background: "linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)",
            }}
          >
            <span
              style={{
                color: "#94a3b8",
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              {watchedMovies.length} movies watched
              {includeAnticipated && anticipatedMovies.length > 0
                ? ` + ${Math.min(anticipatedMovies.length, maxMovies - watchedMovies.length > 0 ? maxMovies - watchedMovies.length : 0)} anticipated`
                : ""}
            </span>
            <span
              style={{
                color: "#e2e8f0",
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              What To Watch
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
