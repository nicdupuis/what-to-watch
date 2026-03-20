"use client";

import useSWR from "swr";
import { MovieSummary } from "@/types/movie";
import { useSettings } from "./use-settings";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMovies() {
  const { settings, isConfigured } = useSettings();

  const params = new URLSearchParams({
    username: settings.letterboxdUsername,
    year: "2026",
  });
  if (settings.listSlug) params.set("listSlug", settings.listSlug);
  if (settings.tag) params.set("tag", settings.tag);

  const { data, error, isLoading, mutate } = useSWR<MovieSummary[]>(
    isConfigured ? `/api/movies?${params}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    movies: data || [],
    error,
    isLoading,
    isConfigured,
    mutate,
  };
}
