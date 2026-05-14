# Status — as of 2026-05-14

## What's built and working

### Map & rendering
- Flighty-style dark basemap (OpenFreeMap vector tiles, custom style JSON in `src/map/style.ts`)
- 3,269 airport dots rendered via deck.gl `ScatterplotLayer`
- Dots scaled into 4 tiers by route count (small <10, medium <40, large <120, mega-hub ≥120)
- Cool grey-blue default color; white for hover/destination; amber for selected & hubs
- Tier-0 airports hidden below zoom 3 to reduce visual noise
- Arcs rendered as great-circle `ArcLayer` with amber gradient

### Interactions
- Click airport → arcs to all destinations
- Click destination (or arc) → route detail panel
- Click empty space → clear selection
- Esc → clear selection
- Hover state on dots (size & opacity bump)
- Picking radius of 8px so thin arcs are easy to click

### Filters
- Airport search (IATA / city / name prefix)
- Airline filter with logo (combobox over 637 airlines)
- Hub bolding for filtered airline (top 6 airports by outbound count, amber rings)
- Domestic / International toggle (compares origin & dest country)
- **Operated / All toggle** — when an airline is selected, switch between "All" (operator + codeshares) and "Operated" (operator only; live-data routes only; OpenFlights routes fall back to loose match). Toggle resets when airline changes.
- All filters compose — airline + operated + dom + airport-selection all stack

### Panels
- Right-side glass panel for airport and route detail views
- Route view splits operator from codeshares when source is `'live'`
- Falls back to combined "Carriers" list (with disclaimer) for OpenFlights routes
- Source badge: green "Live schedule" pill / grey "OpenFlights" pill
- Destination IATA in route header is a tappable button (pivots to that airport as new origin)
- Destination list: row click = open route detail; hover-revealed "↗" = pivot

### Airline logos
- 92% coverage — served via jsDelivr CDN from `urbullet/iata-airelines-logos`
- Build-time manifest fetched from jsDelivr's flat-files API; placeholder PNGs (8714 bytes) filtered out
- Falls back to IATA pill when no logo URL or the image fails to load
- Logos appear in: filter dropdown rows, the active-filter input chip, every carrier row in panels

## What's known to be incomplete

### Data coverage
- **304 airports** have live AeroDataBox data. **263 have full 24h coverage** (both morning 06:00–18:00 and evening 18:00–06:00 windows). 41 have morning-only.
- **~137 airports in the top 400 still uncrawled.** Next quota reset unlocks more. `fetch-aerodatabox.ts` is fully resumable — re-running picks up exactly where it left off.
- The evening window captures transatlantic/overnight departures missed by morning-only crawls. Infrequent routes (non-daily) may still be absent even with full 24h coverage of a single day.
- 5 permanently closed/restricted airports hardcoded-skipped (TXL, SXF, NAY, RYG, KBP). AZA (Mesa Gateway) added to `state.nodata` after a 204 response during crawl.
- Long-tail airports (~2,925) still use OpenFlights data — last meaningfully updated ~2014.
- **Route counts in built data:** 33,387 total route entries across 3,227 origins — 23,014 live, 10,373 OpenFlights.

### Crawl state (raw data)
- `public/raw/aerodatabox-state.json` — per-window completion map, nodata list, failed list, route map, airline metadata
- `public/raw/aerodatabox-routes.json` — serialized for `build-data.ts`; fields: `routes`, `airlines`, `covered` (any window), `fullyCovered` (both windows), `windows`
- Current key: `default-application_11937183` (free tier, 600 units/month @ 2 units per 12h window call). Old key `default-application_11936546` was exposed via screenshot — rotate if not done.

### Carrier attribution quirks
- For live routes, `airlines` is the union of operator + codeshares. The "Operated" toggle filters on `operator` field only (live routes). OpenFlights routes have no operator/codeshare distinction — toggle has no effect there.
- For OpenFlights routes, `airlines` is the historical union of every carrier tagged on the segment. Inflated, but accepted as the cost of covering small airports.

### Live flight tracking (not yet built)
- Feature design agreed: "Show live flights" button in route detail panel → one Airlabs API call → plane dots on the arc + flight list in panel. No auto-polling.
- **Airlabs** is the best fit: CORS-open (`*`), `dep_icao`+`arr_icao` filter, ~50 req/day free tier.
- Prerequisite: ICAO codes need to be added to `airports.json` (available in OpenFlights `airports.dat` col 5, add via `build-data.ts`). Currently only IATA is stored.
- AeroDataBox also has a route endpoint but quota exhausted until next billing cycle.

### Smaller polish gaps
- No mobile layout — panels overflow on small screens.
- The "Live schedule" / "OpenFlights" pill is informational but not explained in any tooltip.
- No loading state for the logo images (they pop in as they download).
- `Status.tsx` hint doesn't change when an airport is selected (only when nothing is selected).
