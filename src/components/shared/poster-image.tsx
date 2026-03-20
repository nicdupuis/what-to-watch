"use client";

import Image from "next/image";
import { Film } from "lucide-react";

import { cn } from "@/lib/utils";
import { tmdbImageUrl } from "@/lib/utils";

const sizeMap = {
  sm: { width: 154, height: 231, tmdb: "w342" },
  md: { width: 342, height: 513, tmdb: "w500" },
  lg: { width: 500, height: 750, tmdb: "w780" },
} as const;

export interface PosterImageProps {
  posterPath: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function PosterImage({
  posterPath,
  alt,
  size = "md",
  className,
}: PosterImageProps) {
  const { width, height, tmdb } = sizeMap[size];

  if (!posterPath) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted",
          className,
        )}
        style={{ width, height }}
      >
        <Film className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={tmdbImageUrl(posterPath, tmdb)}
      alt={alt}
      width={width}
      height={height}
      className={cn("rounded-md object-cover", className)}
    />
  );
}

export { PosterImage };
