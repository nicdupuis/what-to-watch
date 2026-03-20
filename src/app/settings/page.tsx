"use client";

import { useSettings, SavedTheatre } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, MapPin, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import useSWR from "swr";

interface Theatre {
  theatreId: number;
  theatreName: string;
  shortTheatreName: string;
  theatreUrl: string;
  location: {
    geoLocation: { latitude: number; longitude: number } | null;
    address: string;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { settings, setSettings, loaded } = useSettings();
  const [saved, setSaved] = useState(false);
  const [theatreSearch, setTheatreSearch] = useState("");
  const [savedTheatres, setSavedTheatres] = useState<SavedTheatre[]>([]);

  const { data: theatres, isLoading: theatresLoading } = useSWR<Theatre[]>(
    "/api/cineplex/theatres",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Initialize local state from settings once loaded
  const [initialized, setInitialized] = useState(false);
  if (loaded && !initialized) {
    // Migrate from single theatre to savedTheatres if needed
    if (settings.savedTheatres.length > 0) {
      setSavedTheatres(settings.savedTheatres);
    } else if (settings.theatreId && settings.theatreName) {
      setSavedTheatres([{ id: settings.theatreId, name: settings.theatreName }]);
    }
    setInitialized(true);
  }

  const MAX_THEATRES = 5;

  function addTheatre(id: number, name: string) {
    if (savedTheatres.length >= MAX_THEATRES) return;
    if (savedTheatres.some((t) => t.id === id)) return;
    setSavedTheatres((prev) => [...prev, { id, name }]);
  }

  function removeTheatre(id: number) {
    setSavedTheatres((prev) => prev.filter((t) => t.id !== id));
  }

  const filteredTheatres = useMemo(() => {
    if (!theatres) return [];
    if (!theatreSearch.trim()) return theatres;
    const q = theatreSearch.toLowerCase();
    return theatres.filter(
      (t) =>
        t.theatreName.toLowerCase().includes(q) ||
        t.location.address.toLowerCase().includes(q)
    );
  }, [theatres, theatreSearch]);

  if (!loaded) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const primary = savedTheatres[0] ?? null;
    setSettings({
      letterboxdUsername: (form.get("letterboxdUsername") as string).trim(),
      listSlug: (form.get("listSlug") as string).trim(),
      anticipatedListUrl: (form.get("anticipatedListUrl") as string).trim(),
      tag: (form.get("tag") as string).trim(),
      city: (form.get("city") as string).trim(),
      theatreId: primary?.id ?? null,
      theatreName: primary?.name ?? "",
      savedTheatres,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your What To Watch preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Letterboxd</CardTitle>
            <CardDescription>
              Connect your Letterboxd account to track watched movies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="letterboxdUsername" className="text-sm font-medium">
                Username
              </label>
              <input
                id="letterboxdUsername"
                name="letterboxdUsername"
                type="text"
                defaultValue={settings.letterboxdUsername}
                placeholder="e.g. your-username"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Your Letterboxd username (from letterboxd.com/your-username)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="listSlug" className="text-sm font-medium">
                List slug
              </label>
              <input
                id="listSlug"
                name="listSlug"
                type="text"
                defaultValue={settings.listSlug}
                placeholder="e.g. top-2026"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                The slug of your Letterboxd list for 2026 movies (from the URL)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="anticipatedListUrl" className="text-sm font-medium">
                Most Anticipated list
              </label>
              <input
                id="anticipatedListUrl"
                name="anticipatedListUrl"
                type="text"
                defaultValue={settings.anticipatedListUrl}
                placeholder="e.g. https://boxd.it/abc123 or https://letterboxd.com/user/list/name/"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Share link or URL to your anticipated movies list. Supports private lists via share links.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="tag" className="text-sm font-medium">
                Tag (optional fallback)
              </label>
              <input
                id="tag"
                name="tag"
                type="text"
                defaultValue={settings.tag}
                placeholder="e.g. top2026"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Letterboxd tag you use to mark 2026 films (optional, used as fallback)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Theatres
            </CardTitle>
            <CardDescription>
              Select up to {MAX_THEATRES} Cineplex theatres for showtimes (first is default)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Saved theatre chips */}
            {savedTheatres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {savedTheatres.map((t, idx) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {idx === 0 && (
                      <MapPin className="h-3 w-3 shrink-0" />
                    )}
                    {t.name}
                    <button
                      type="button"
                      onClick={() => removeTheatre(t.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                      aria-label={`Remove ${t.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={theatreSearch}
                onChange={(e) => setTheatreSearch(e.target.value)}
                placeholder="Search theatres by name or city..."
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="max-h-[200px] overflow-y-auto rounded-md border divide-y">
              {theatresLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading theatres...
                </div>
              ) : filteredTheatres.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {theatreSearch ? "No theatres match your search" : "No theatres available"}
                </div>
              ) : (
                filteredTheatres.map((theatre) => {
                  const isSelected = savedTheatres.some((t) => t.id === theatre.theatreId);
                  const isFull = savedTheatres.length >= MAX_THEATRES;
                  return (
                    <button
                      key={theatre.theatreId}
                      type="button"
                      disabled={!isSelected && isFull}
                      onClick={() => {
                        if (isSelected) {
                          removeTheatre(theatre.theatreId);
                        } else {
                          addTheatre(theatre.theatreId, theatre.theatreName);
                        }
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : ""
                      }`}
                    >
                      <div className="font-medium">{theatre.theatreName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {theatre.location.address}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <label htmlFor="city" className="text-xs font-medium text-muted-foreground">
                City (optional)
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={settings.city}
                placeholder="e.g. Montreal"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}
