import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface WatchedBadgeProps {
  rating: number | null;
  className?: string;
}

function WatchedBadge({ rating, className }: WatchedBadgeProps) {
  return (
    <div
      className={cn(
        "absolute right-2 top-2 flex flex-col items-center gap-1",
        className,
      )}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white shadow-md">
        <Check className="h-4 w-4" />
      </div>
      {rating !== null && rating > 0 && (
        <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-xs font-bold text-yellow-400">
          {rating}
        </span>
      )}
    </div>
  );
}

export { WatchedBadge };
