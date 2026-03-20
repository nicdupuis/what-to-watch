const API_BASE = "https://apis.cineplex.com/prod/cpx/theatrical/api/v1";
const API_KEY = "dcdac5601d864addbc2675a2e96cb1f8";

function cpxFetch(path: string, revalidate: number = 1800) {
  return fetch(`${API_BASE}${path}`, {
    next: { revalidate },
    headers: {
      "Ocp-Apim-Subscription-Key": API_KEY,
      "User-Agent": "WhatToWatch/1.0",
    },
  });
}

export interface CineplexTheatre {
  theatreId: number;
  theatreName: string;
  shortTheatreName: string;
  theatreUrl: string;
  location: {
    geoLocation: { latitude: number; longitude: number };
    address: { address1: string; city: string; provinceCode: string; postalCode: string };
  };
}

export interface CineplexSession {
  ticketingUrl: string;
  showStartDateTime: string;
  showStartTime: string;
  isSoldOut: boolean;
}

export interface CineplexExperience {
  experienceTypes: string[];
  sessions: CineplexSession[];
  isCcEnabled: boolean;
}

export interface CineplexShowtimeMovie {
  id: number;
  name: string;
  filmUrl: string;
  runtimeInMinutes: number;
  smallPosterImageUrl: string;
  mediumPosterImageUrl: string;
  largePosterImageUrl: string;
  genres: string[];
  isEvent: boolean;
  experiences: CineplexExperience[];
}

export interface CineplexShowtimeDate {
  startDate: string;
  movies: CineplexShowtimeMovie[];
}

export interface CineplexShowtimeResponse {
  theatre: string;
  theatreId: number;
  dates: CineplexShowtimeDate[];
}

export async function getTheatres(): Promise<CineplexTheatre[]> {
  const res = await cpxFetch("/theatres?language=en", 86400);
  if (!res.ok) throw new Error(`Cineplex theatres failed: ${res.status}`);
  const data = await res.json();
  return data.otherTheatres ?? [];
}

export async function getShowtimes(
  theatreId: number,
  date: string
): Promise<CineplexShowtimeResponse[]> {
  const res = await cpxFetch(
    `/showtimes?language=en&locationId=${theatreId}&date=${date}`,
    1800
  );
  if (!res.ok) throw new Error(`Cineplex showtimes failed: ${res.status}`);
  return res.json();
}

export async function getNowPlaying(): Promise<
  { id: number; name: string; filmUrl: string; mediumPosterImageUrl: string; genres: string[]; isNowPlaying: boolean; isComingSoon: boolean; releaseDate: string }[]
> {
  const res = await cpxFetch("/movies?language=en", 3600);
  if (!res.ok) throw new Error(`Cineplex movies failed: ${res.status}`);
  const data = await res.json();
  return data.items ?? data;
}
