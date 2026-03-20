"use client";

import { GENRE_MAP } from "@/types/movie";
import { Select } from "@/components/ui/select";
import { ToggleGroup } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface MovieFilters {
  month: string;
  genre: string;
  watchedFilter: string;
  sortBy: string;
  sourceFilter: string;
}

export interface MovieFiltersProps {
  filters: MovieFilters;
  onFilterChange: (filters: MovieFilters) => void;
  className?: string;
}

const MONTH_OPTIONS = [
  { value: "", label: "All months" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const GENRE_OPTIONS = [
  { value: "", label: "All genres" },
  ...Object.entries(GENRE_MAP).map(([id, name]) => ({
    value: id,
    label: name,
  })),
];

const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "release_date", label: "Release Date" },
  { value: "rating", label: "Rating" },
  { value: "list_ranking", label: "List Ranking" },
  { value: "title", label: "Title" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "watched-list", label: "Watched" },
  { value: "anticipated", label: "Anticipated" },
  { value: "discover", label: "Discover" },
];

const WATCHED_OPTIONS = [
  { value: "all", label: "All" },
  { value: "watched", label: "Watched" },
  { value: "unwatched", label: "Unwatched" },
];

function MovieFiltersBar({
  filters,
  onFilterChange,
  className,
}: MovieFiltersProps) {
  const updateFilter = <K extends keyof MovieFilters>(
    key: K,
    value: MovieFilters[K],
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        className,
      )}
    >
      <Select
        value={filters.month}
        onChange={(value) => updateFilter("month", value)}
        options={MONTH_OPTIONS}
        className="w-40"
      />

      <Select
        value={filters.genre}
        onChange={(value) => updateFilter("genre", value)}
        options={GENRE_OPTIONS}
        className="w-40"
      />

      <ToggleGroup
        options={SOURCE_OPTIONS}
        value={filters.sourceFilter}
        onChange={(value) => updateFilter("sourceFilter", value as string)}
      />

      <ToggleGroup
        options={WATCHED_OPTIONS}
        value={filters.watchedFilter}
        onChange={(value) => updateFilter("watchedFilter", value as string)}
      />

      <Select
        value={filters.sortBy}
        onChange={(value) => updateFilter("sortBy", value)}
        options={SORT_OPTIONS}
        className="w-40"
      />
    </div>
  );
}

export { MovieFiltersBar };
