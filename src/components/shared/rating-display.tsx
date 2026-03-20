import { Star, StarHalf } from "lucide-react";

import { cn } from "@/lib/utils";

export interface RatingDisplayProps {
  rating: number;
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
} as const;

function RatingDisplay({ rating, size = "md", className }: RatingDisplayProps) {
  const iconClass = sizeClasses[size];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: fullStars }, (_, i) => (
        <Star
          key={`full-${i}`}
          className={cn(iconClass, "fill-yellow-400 text-yellow-400")}
        />
      ))}
      {hasHalfStar && (
        <StarHalf
          key="half"
          className={cn(iconClass, "fill-yellow-400 text-yellow-400")}
        />
      )}
      {Array.from({ length: emptyStars }, (_, i) => (
        <Star
          key={`empty-${i}`}
          className={cn(iconClass, "text-muted-foreground")}
        />
      ))}
    </div>
  );
}

export { RatingDisplay };
