import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function MovieCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Poster placeholder */}
      <Skeleton className="aspect-[2/3] w-full rounded-b-none" />
      <CardContent className="p-3">
        {/* Title */}
        <Skeleton className="mb-2 h-4 w-3/4" />
        {/* Date */}
        <Skeleton className="mb-2 h-3 w-1/2" />
        {/* Genre badges */}
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function MovieGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 12 }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
}

export { MovieCardSkeleton, MovieGridSkeleton };
