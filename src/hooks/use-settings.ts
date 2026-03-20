"use client";

import { useState, useEffect, useCallback } from "react";

export interface UserSettings {
  letterboxdUsername: string;
  tmdbApiKey: string;
  listSlug: string;
  anticipatedListUrl: string;
  tag: string;
  city: string;
}

const STORAGE_KEY = "what-to-watch-settings";

const defaultSettings: UserSettings = {
  letterboxdUsername: "",
  tmdbApiKey: "",
  listSlug: "top-2026",
  anticipatedListUrl: "",
  tag: "top2026",
  city: "",
};

export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettingsState({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  const setSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isConfigured = settings.letterboxdUsername.length > 0;

  return { settings, setSettings, isConfigured, loaded };
}
