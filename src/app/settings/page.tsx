"use client";

import { useSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const { settings, setSettings, loaded } = useSettings();
  const [saved, setSaved] = useState(false);

  if (!loaded) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSettings({
      letterboxdUsername: (form.get("letterboxdUsername") as string).trim(),
      listSlug: (form.get("listSlug") as string).trim(),
      anticipatedListUrl: (form.get("anticipatedListUrl") as string).trim(),
      tag: (form.get("tag") as string).trim(),
      city: (form.get("city") as string).trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your Oscar Tracker preferences
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
            <CardTitle>Location</CardTitle>
            <CardDescription>
              For theater showtimes (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-medium">
                City
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
