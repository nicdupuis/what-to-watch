import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { LetterboxdEntry, LetterboxdListEntry } from "@/types/letterboxd";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  htmlEntities: true,
});

function decodeEntities(str: string): string {
  return str
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

export async function parseRSS(
  username: string
): Promise<LetterboxdEntry[]> {
  const res = await fetch(`https://letterboxd.com/${username}/rss/`, {
    next: { revalidate: 1800 },
    headers: { "User-Agent": "OscarTracker/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Letterboxd RSS failed: ${res.status}`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);

  const items = parsed?.rss?.channel?.item;
  if (!items) return [];

  const entries: LetterboxdEntry[] = [];
  const itemList = Array.isArray(items) ? items : [items];

  for (const item of itemList) {
    const title = decodeEntities(item["letterboxd:filmTitle"] || "");
    const year = parseInt(item["letterboxd:filmYear"] || "0", 10);
    const watchedDate = item["letterboxd:watchedDate"] || "";
    const ratingStr = item["letterboxd:memberRating"];
    const rating = ratingStr ? parseFloat(ratingStr) : null;
    const filmUrl = item.link || "";

    let posterUrl: string | null = null;
    const desc = item.description || "";
    const posterMatch = desc.match(/<img\s+src="([^"]+)"/);
    if (posterMatch) {
      posterUrl = posterMatch[1];
    }

    let review: string | null = null;
    const reviewMatch = desc.match(/<p>(.+?)<\/p>/g);
    if (reviewMatch && reviewMatch.length > 1) {
      review =
        reviewMatch[reviewMatch.length - 1].replace(/<[^>]+>/g, "").trim();
    }

    entries.push({
      title,
      year,
      watchedDate,
      rating,
      filmUrl,
      posterUrl,
      review,
    });
  }

  return entries;
}

/**
 * Resolves a Letterboxd share link (boxd.it or full share URL) to the
 * canonical scrape-able URL. Returns the resolved URL or the input if
 * it's already a direct list URL.
 */
async function resolveListUrl(input: string): Promise<string> {
  const trimmed = input.trim();

  // Already a full letterboxd.com list URL (with or without share token)
  if (trimmed.includes("letterboxd.com/") && trimmed.includes("/list/")) {
    return trimmed.replace(/\/$/, "");
  }

  // boxd.it short link — follow redirects to get the real URL
  if (trimmed.includes("boxd.it/")) {
    const res = await fetch(trimmed, {
      redirect: "follow",
      headers: { "User-Agent": "OscarTracker/1.0" },
    });
    // The final URL after redirects is the canonical one
    const finalUrl = res.url;
    if (finalUrl.includes("letterboxd.com/")) {
      return finalUrl.replace(/\/$/, "");
    }
    throw new Error(`Could not resolve share link: ${trimmed}`);
  }

  // Assume it's a slug like "top-2026" — caller should handle this
  return trimmed;
}

/**
 * Parses posteritem elements from a Letterboxd list page.
 */
function parsePosterItems(
  $: cheerio.CheerioAPI,
  startPosition: number
): LetterboxdListEntry[] {
  const entries: LetterboxdListEntry[] = [];

  $("li.posteritem, li.griditem").each((_i, el) => {
    const li = $(el);
    const reactDiv = li.find("div.react-component");

    const itemName = reactDiv.attr("data-item-name") || "";
    const filmSlug = reactDiv.attr("data-item-slug") || "";
    const ownerRatingStr = li.attr("data-owner-rating");
    const ownerRating = ownerRatingStr ? parseInt(ownerRatingStr, 10) : null;

    // data-item-name is "Title (Year)" or just "Title"
    const nameMatch = itemName.match(/^(.+?)\s*\((\d{4})\)$/);
    const title = nameMatch ? nameMatch[1].trim() : itemName;
    const year = nameMatch ? parseInt(nameMatch[2], 10) : 0;

    const filmUrl = `https://letterboxd.com/film/${filmSlug}/`;

    entries.push({
      title,
      year,
      filmUrl,
      filmSlug,
      position: startPosition + entries.length + 1,
      ownerRating,
      tmdbId: null,
    });
  });

  return entries;
}

/**
 * Resolves TMDB IDs for a batch of Letterboxd entries by fetching
 * each film's Letterboxd page and extracting `data-tmdb-id`.
 * This is the only reliable way to get the correct TMDB mapping.
 */
async function resolveTmdbIds(
  entries: LetterboxdListEntry[]
): Promise<void> {
  const BATCH_SIZE = 10;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (entry) => {
        try {
          const res = await fetch(
            `https://letterboxd.com/film/${entry.filmSlug}/`,
            {
              next: { revalidate: 86400 },
              headers: { "User-Agent": "OscarTracker/1.0" },
            }
          );
          if (!res.ok) return;
          const html = await res.text();
          const match = html.match(/data-tmdb-id="(\d+)"/);
          if (match) {
            entry.tmdbId = parseInt(match[1], 10);
          }
        } catch {
          // Leave tmdbId as null
        }
      })
    );
  }
}

/**
 * Scrapes a Letterboxd list. Accepts:
 *   - A full URL (including share URLs for private lists)
 *   - A boxd.it short link
 *   - A plain slug (will construct the URL using the username)
 */
export async function scrapeList(
  usernameOrUrl: string,
  listSlugOrUrl?: string
): Promise<LetterboxdListEntry[]> {
  let baseUrl: string;

  if (listSlugOrUrl) {
    // Check if the second arg is a full URL or share link
    if (
      listSlugOrUrl.includes("letterboxd.com/") ||
      listSlugOrUrl.includes("boxd.it/")
    ) {
      baseUrl = await resolveListUrl(listSlugOrUrl);
    } else {
      // Plain slug
      baseUrl = `https://letterboxd.com/${usernameOrUrl}/list/${listSlugOrUrl}`;
    }
  } else {
    // First arg is the full URL
    baseUrl = await resolveListUrl(usernameOrUrl);
  }

  const entries: LetterboxdListEntry[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = page === 1 ? `${baseUrl}/` : `${baseUrl}/page/${page}/`;

    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": "OscarTracker/1.0" },
    });

    if (!res.ok) {
      if (page === 1)
        throw new Error(`Letterboxd list scrape failed: ${res.status}`);
      break;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const pageEntries = parsePosterItems($, entries.length);
    if (pageEntries.length === 0) {
      hasMore = false;
      break;
    }

    entries.push(...pageEntries);

    const nextPage = $("a.next");
    hasMore = nextPage.length > 0;
    page++;
  }

  // Resolve TMDB IDs from Letterboxd film pages
  await resolveTmdbIds(entries);

  return entries;
}

/**
 * Scrapes the user's COMPLETE watch history from their films page.
 * Paginates through all pages until no more posteritems are found.
 * Does NOT call resolveTmdbIds (too many films, would be too slow).
 */
export async function scrapeAllWatchedFilms(
  username: string
): Promise<LetterboxdListEntry[]> {
  const entries: LetterboxdListEntry[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url =
      page === 1
        ? `https://letterboxd.com/${username}/films/`
        : `https://letterboxd.com/${username}/films/page/${page}/`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "OscarTracker/1.0" },
    });

    if (!res.ok) {
      if (page === 1)
        throw new Error(`Letterboxd films scrape failed: ${res.status}`);
      break;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const pageEntries = parsePosterItems($, entries.length);
    if (pageEntries.length === 0) {
      hasMore = false;
      break;
    }

    entries.push(...pageEntries);

    const nextPage = $("a.next");
    hasMore = nextPage.length > 0;
    page++;
  }

  return entries;
}

/**
 * Scrapes films tagged by a user.
 */
export async function scrapeTaggedFilms(
  username: string,
  tag: string
): Promise<LetterboxdListEntry[]> {
  const entries: LetterboxdListEntry[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url =
      page === 1
        ? `https://letterboxd.com/${username}/films/tag/${tag}/`
        : `https://letterboxd.com/${username}/films/tag/${tag}/page/${page}/`;

    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": "OscarTracker/1.0" },
    });

    if (!res.ok) {
      if (page === 1)
        throw new Error(`Letterboxd tag scrape failed: ${res.status}`);
      break;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const pageEntries = parsePosterItems($, entries.length);
    if (pageEntries.length === 0) {
      hasMore = false;
      break;
    }

    entries.push(...pageEntries);

    const nextPage = $("a.next");
    hasMore = nextPage.length > 0;
    page++;
  }

  await resolveTmdbIds(entries);

  return entries;
}
