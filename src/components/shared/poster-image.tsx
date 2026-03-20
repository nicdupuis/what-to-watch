"use client";

import Image from "next/image";
import { Film, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { tmdbImageUrl } from "@/lib/utils";

const sizeMap = {
  sm: { width: 154, height: 231, tmdb: "w342" },
  md: { width: 342, height: 513, tmdb: "w500" },
  lg: { width: 500, height: 750, tmdb: "w780" },
} as const;

export interface PosterImageProps {
  posterPath: string | null;
  backdropPath?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function PosterImage({
  posterPath,
  backdropPath,
  alt,
  size = "md",
  className,
}: PosterImageProps) {
  const { width, height, tmdb } = sizeMap[size];

  // No poster but we have a backdrop — use it as fallback
  if (!posterPath && backdropPath) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image
          src={tmdbImageUrl(backdropPath, "w780")}
          alt={alt}
          fill
          className="object-cover object-center"
        />
        {/* Unofficial image indicator */}
        <div className="group/tip absolute top-1.5 right-1.5 z-10">
          <AlertCircle className="h-4 w-4 text-amber-400 drop-shadow" />
          <div className="absolute right-0 top-6 hidden whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md group-hover/tip:block">
            Not an official poster
          </div>
        </div>
      </div>
    );
  }

  // No image at all — centered placeholder
  if (!posterPath) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-muted",
          className,
        )}
      >
        <Film className="h-10 w-10 text-muted-foreground/50" />
        <span className="max-w-[80%] text-center text-xs font-medium text-muted-foreground leading-tight">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={tmdbImageUrl(posterPath, tmdb)}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-cover", className)}
    />
  );
}

export { PosterImage };
