# What To Watch

A personal movie & TV tracking web app for the 2026 season. Integrates with Letterboxd for your watch history, TMDB for movie data, and Cineplex for theater showtimes.

## Features

- **Movie Grid** — Browse 2026 releases with filters (source, genre, month, watched status). Flipping cards show poster on front, details + streaming availability on back.
- **Letterboxd Integration** — Syncs your watched list (ranked) and anticipated list (via share links). Supports private lists.
- **Release Calendar** — Timeline view with countdowns grouped by month. Filter by anticipated/notable.
- **Cineplex Showtimes** — Live showtimes for up to 5 theaters. Compare times across locations. Direct ticketing links.
- **TV Shows** — Trending and discover tabs for ongoing shows with streaming provider info.
- **Awards Tracker** — 2025-2026 awards season: Critics Choice, Golden Globes, BAFTA, SAG, Oscars with winners.
- **Film Festivals** — Timeline of major 2026 festivals (Sundance through AFI Fest) with prize winners.
- **Recommendations** — Personalized suggestions based on your 5-star Letterboxd films, refreshable.
- **Taste Profile** — Genre, director, and actor breakdowns from your full 2026 viewing diary.
- **Social Poster Grid** — Generate a 1080x1080 Instagram-format poster collage of your ranked films.
- **Dark Mode** — Default dark theme with light mode toggle.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **UI**: Tailwind CSS v4, shadcn/ui components, Lucide icons
- **Data**: TMDB API, Letterboxd (RSS + HTML scraping), Cineplex API
- **Charts**: Recharts
- **Deployment**: Vercel (or any Node.js host)

## Setup

### Prerequisites

- Node.js 20+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/nicdupuis/what-to-watch.git
cd what-to-watch
```

### 2. Install dependencies

```bash
npm install
```

> **Corporate network?** If `npm install` times out, you may need to set a registry proxy in `.npmrc`.

### 3. Set up environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required — get a free key at https://www.themoviedb.org/settings/api
TMDB_API_KEY=your_tmdb_api_key

# Required for Showtimes tab — extract from cineplex.com frontend JS
CINEPLEX_API_KEY=your_cineplex_api_key
```

**Getting a TMDB API key:**
1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to Settings > API > Create > Developer
3. Copy the "API Key (v3 auth)" value

**Getting the Cineplex API key:**
The key is embedded in the Cineplex.com frontend JavaScript. Open browser dev tools on cineplex.com, go to the Network tab, and search for `Ocp-Apim-Subscription-Key` in request headers.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Configure your settings

1. Go to **Settings** (gear icon in header)
2. Enter your **Letterboxd username**
3. Set your **watched list slug** (e.g. `top-2026` — the part after `/list/` in the URL)
4. Paste your **anticipated list share link** (from Letterboxd's list share button, e.g. `https://boxd.it/abc123...`)
5. Search and select your **Cineplex theater(s)**
6. Click **Save**

### 6. Build for production

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables (`TMDB_API_KEY`, `CINEPLEX_API_KEY`) in the Vercel dashboard
4. Deploy

## Project Structure

```
src/
├── app/
│   ├── api/              # Server-side API routes
│   │   ├── movies/       # Combined TMDB + Letterboxd data
│   │   ├── recommendations/  # Personalized movie recs
│   │   ├── diary/        # Full 2026 watch diary
│   │   ├── cineplex/     # Theater showtimes
│   │   ├── tmdb/         # TMDB proxy routes
│   │   ├── tv/           # TV show routes
│   │   └── letterboxd/   # RSS + list scraping
│   ├── movies/           # Movie grid + detail pages
│   ├── calendar/         # Release timeline
│   ├── tv/               # TV shows
│   ├── showtimes/        # Cineplex showtimes
│   ├── awards/           # Awards season tracker
│   ├── festivals/        # Film festival timeline
│   ├── poster-grid/      # Social poster generator
│   └── settings/         # User configuration
├── components/           # UI components (shadcn + custom)
├── hooks/                # Client-side hooks (useMovies, useSettings)
├── lib/                  # API clients (tmdb, letterboxd, cineplex, rate-limit)
└── types/                # TypeScript interfaces
```

## Notes

- **Letterboxd has no official API** — data is scraped from RSS feeds and HTML pages. If Letterboxd changes their markup, the scrapers may need updating.
- **TMDB rate limit** is ~40 req/10s. The app batches requests and caches aggressively to stay within limits.
- **Cineplex API key** is extracted from their public frontend — it may rotate. Re-extract if showtimes stop working.
- **Rate limiting** is built in for heavy routes (movies, recommendations, diary) to prevent abuse.
