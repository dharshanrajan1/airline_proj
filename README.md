# Route Explorer

Interactive map for exploring commercial airline routes worldwide. Click any airport to see where it flies, filter by airline, and toggle between domestic/international views.

**Live demo:** https://dharshanrajan1.github.io/airline_proj/

## Tech Stack

- **Deck.gl** — WebGL-accelerated ArcLayer for rendering thousands of flight paths
- **MapLibre GL** — vector tile basemap (OpenFreeMap, no API key needed)
- **React 18** + **TypeScript** + **Zustand** for state
- **Vite** for build tooling

## Data

Route and airport data sourced from [OpenFlights](https://openflights.org/data.html), augmented with live departure schedules from AeroDataBox (RapidAPI) and scraped United Airlines hub data from Wikipedia. The build pipeline (`scripts/build-data.ts`) merges these sources into static JSON served at runtime.

~3,200 airports and ~33,000 route entries.

## Running Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173/airline_proj/`.

## Rebuilding Data

To re-fetch and rebuild the route dataset from scratch:

```bash
# Set up API credentials (only needed for AeroDataBox crawl)
cp .env.example .env
# Edit .env with your RapidAPI key

npm run fetch:adb       # crawl AeroDataBox departures
npm run fetch:ua-wiki   # scrape UA hub routes from Wikipedia
npm run build:data      # merge everything into public/data/*.json
```

## Deploying

Pushes to `main` auto-deploy to GitHub Pages via the workflow in `.github/workflows/deploy.yml`.
