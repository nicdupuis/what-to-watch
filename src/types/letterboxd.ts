export interface LetterboxdEntry {
  title: string;
  year: number;
  watchedDate: string;
  rating: number | null;
  filmUrl: string;
  posterUrl: string | null;
  review: string | null;
}

export interface LetterboxdListEntry {
  title: string;
  year: number;
  filmUrl: string;
  filmSlug: string;
  position: number;
  ownerRating: number | null; // 1-10 scale from ranked lists
}
