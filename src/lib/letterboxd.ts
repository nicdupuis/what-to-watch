import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { LetterboxdEntry, LetterboxdListEntry } from "@/types/letterboxd";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

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
    const title = item["letterboxd:filmTitle"] || "";
    const year = parseInt(item["letterboxd:filmYear"] || "0", 10);
    const watchedDate = item["letterboxd:watchedDate"] || "";
    const ratingStr = item["letterboxd:memberRating"];
    const rating = ratingStr ? parseFloat(ratingStr) : null;
    const filmUrl = item.link || "";

    // Extract poster from description HTML
    let posterUrl: string | null = null;
    const desc = item.description || "";
    const posterMatch = desc.match(/<img\s+src="([^"]+)"/);
    if (posterMatch) {
      posterUrl = posterMatch[1];
    }

    // Extract review text (after the poster image)
    let review: string | null = null;
    const reviewMatch = desc.match(/<p>(.+?)<\/p>/g);
    if (reviewMatch && reviewMatch.length > 1) {
      review = reviewMatch[reviewMatch.length - 1].replace(/<[^>]+>/g, "").trim();
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

export async function scrapeList(
  username: string,
  listSlug: string
): Promise<LetterboxdListEntry[]> {
  const entries: LetterboxdListEntry[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url =
      page === 1
        ? `https://letterboxd.com/${username}/list/${listSlug}/`
        : `https://letterboxd.com/${username}/list/${listSlug}/page/${page}/`;

    const res = await fetch(url, {
      next: { revalidate: 1800 },
      headers: { "User-Agent": "OscarTracker/1.0" },
    });

    if (!res.ok) {
      if (page === 1) throw new Error(`Letterboxd list scrape failed: ${res.status}`);
      break;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const films = $("li.poster-container");
    if (films.length === 0) {
      hasMore = false;
      break;
    }

    films.each((i, el) => {
      const poster = $(el).find("div.film-poster");
      const filmSlug = poster.attr("data-film-slug") || "";
      const filmTitle =
        poster.find("img").attr("alt") || "";
      const filmYear = parseInt(
        poster.attr("data-film-release-year") || "0",
        10
      );
      const filmUrl = `https://letterboxd.com/film/${filmSlug}/`;

      entries.push({
        title: filmTitle,
        year: filmYear,
        filmUrl,
        filmSlug,
        position: entries.length + 1,
      });
    });

    // Check if there's a next page
    const nextPage = $("a.next");
    hasMore = nextPage.length > 0;
    page++;
  }

  return entries;
}

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
      if (page === 1) throw new Error(`Letterboxd tag scrape failed: ${res.status}`);
      break;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const films = $("li.poster-container");
    if (films.length === 0) {
      hasMore = false;
      break;
    }

    films.each((i, el) => {
      const poster = $(el).find("div.film-poster");
      const filmSlug = poster.attr("data-film-slug") || "";
      const filmTitle = poster.find("img").attr("alt") || "";
      const filmYear = parseInt(
        poster.attr("data-film-release-year") || "0",
        10
      );
      const filmUrl = `https://letterboxd.com/film/${filmSlug}/`;

      entries.push({
        title: filmTitle,
        year: filmYear,
        filmUrl,
        filmSlug,
        position: entries.length + 1,
      });
    });

    const nextPage = $("a.next");
    hasMore = nextPage.length > 0;
    page++;
  }

  return entries;
}
