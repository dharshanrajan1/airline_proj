# Overview

A static airline route explorer. Click an airport, see arcs to every destination it has nonstop service to. Click an arc (or a destination dot) to see the route detail with the operating airline and codeshare partners. Filter by airline (with hub bolding) and by domestic/international.

Inspired by Flighty's map aesthetic — dark land, dim water, no POI clutter, glassy floating panels, a single accent color (amber) for action.

## Stack

| Layer | Choice |
|---|---|
| Bundler | Vite |
| Framework | React 18 + TypeScript |
| Map | MapLibre GL JS (vector tiles via OpenFreeMap, no API key) |
| Overlays | deck.gl `ScatterplotLayer` (airports) + `ArcLayer` (routes), via `MapboxOverlay` |
| State | Zustand |
| Styling | Tailwind v3 |
| Logos | jsDelivr CDN over `urbullet/iata-airelines-logos` |

## Run

```bash
npm install         # one-time
npm run dev         # localhost:5173
npm run build:data  # rebuild static JSON (also re-runs logo manifest fetch)
npm run fetch:adb   # AeroDataBox crawl — needs .env with RAPIDAPI_KEY
```

## Layout

```
src/
  components/    Map, Panel, Filters, Status, Attribution, AirlineLogo
  map/           style.ts (MapLibre style JSON), layers.ts (deck.gl layer factory)
  data/          load.ts (async fetch of public/data/*.json into the store)
  lib/           route.ts (airline-matching helpers)
  store.ts       Zustand store
  types.ts       Airport, Airline, Route, Dataset

scripts/
  build-data.ts            Merge OpenFlights + AeroDataBox + logos → public/data/*.json
  fetch-aerodatabox.ts     Crawl AeroDataBox top-400 airports (resumable, rate-limited)
  probe-*.ts               One-off API probes used during development

public/
  data/          Generated JSON shipped to the browser (~2 MB total)
  raw/           Crawl outputs (gitignored, intermediate)
```

## How clicking works

| User does | Result |
|---|---|
| Click any airport (no current selection) | Set as origin; arcs fan out to all destinations |
| Click a destination of the current origin | Select that **route** — panel shows operator + codeshares |
| Click an unrelated airport | Set as new origin |
| Click the arc itself | Same as clicking the destination |
| Click empty map area | Clear selection |
| Click "↗" beside a destination in the list | Pivot — set that destination as the new origin |
| Press Esc | Clear selection |
| Search by IATA / city in the top bar | Set as origin |

## Data model gist

Each route in `routes.json` carries:
- `dest` — destination IATA
- `airlines` — all carriers tagged on the route (operator + codeshares)
- `operator` — operating carrier IATA, if known (only for `source: 'live'`)
- `codeshares` — codeshare partner IATAs, if known
- `source` — `'live'` (AeroDataBox-derived) or `'openflights'` (legacy fallback)

Two sources, deliberately merged:
- `'live'` (~273 origin airports + 6,875 inferred reverse routes) — sharp, with operator/codeshare split
- `'openflights'` (~2,857 long-tail airports) — comprehensive but stale and codeshare-inflated

The airline filter matches on `route.airlines.includes(filter)` — i.e. "this airline is one of the carriers serving the route." For live routes that's clean (real codeshares only). For OpenFlights routes that's loose. See `context/DATA.md` for the full story.
