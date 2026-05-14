# Data pipeline

## Sources

| Source | What it gives | Coverage | Quirks |
|---|---|---|---|
| OpenFlights (`routes.dat`, `airports.dat`, `airlines.dat`) | Static base — every nonstop route ever tagged in OpenFlights | Global, ~3000 commercial airports, ~36k routes | Last meaningfully updated ~2014. `airlines` is a union of every carrier ever on the segment (operator + codeshares, indistinguishable). |
| AeroDataBox (RapidAPI, BASIC plan) | Live schedules for an airport over a time window | 273 origins crawled (top 400 by OpenFlights route count, quota ran out at #273) | 12h window per call, `codeshareStatus: "IsOperator"` flag lets us split operator from codeshares cleanly. Rate-limited; monthly quota ~500. |
| `urbullet/iata-airelines-logos` via jsDelivr | Airline logos (PNG) | 92% of our airlines | Some IATAs serve a generic placeholder (exactly 8714 bytes) — filtered by size at manifest time. |

## Merge logic (`scripts/build-data.ts`)

Order matters:

1. **Parse OpenFlights routes** into a `routesByPair` map keyed by `"ORIG|DEST"`, value = `Set<airline-IATA>`.
2. **Load AeroDataBox overlay** if `public/raw/aerodatabox-routes.json` exists. Build `coveredOrigins` set.
3. **Pass 1 — OpenFlights routes:** For each `(origin, dest)`, **skip if `coveredOrigins.has(origin)`**. Emit as `source: 'openflights'`.
4. **Pass 2 — AeroDataBox routes:** For each crawled origin, emit `source: 'live'` with `operator` + `codeshares` split.
5. **Pass 3 — Inferred reverse routes:** For each live `A→B` where `B` is *not* in `coveredOrigins`, append `B→A` as `'live'` with the same operator + codeshares. Commercial routes basically always round-trip, so this safely backfills outbound data for non-crawled destinations. Adds ~6,875 routes.
6. **Augment airlines map** with any AeroDataBox-discovered carriers not present in `airlines.dat`.
7. **Compute route counts** per airport (outbound + inbound) → drives the tier system in the UI.
8. **Compute airline hubs** — top 6 airports per airline by outbound route count.
9. **Fetch logo manifest** from jsDelivr (single HTTP call), drop placeholder-size PNGs, mark each airline with `logoUrl` if present.

## The "live" vs "openflights" distinction

We tag every route with a `source` and use it in two places:

- **UI badge** — green "Live schedule" pill or grey "OpenFlights" pill in the route detail panel.
- **Panel display** — `'live'` routes get the operator/codeshares split treatment; `'openflights'` routes show a combined "Carriers" list with a disclaimer.

The airline-matching helper (`src/lib/route.ts`) currently treats both sources the same: `route.airlines.includes(airline)`. This was a deliberate walk-back from an earlier strict-operator-only rule that hid legitimate codeshare destinations like UA→LIS. See `context/STATUS.md` for the reasoning.

## AeroDataBox crawl details

Script: `scripts/fetch-aerodatabox.ts`

- Endpoint: `GET /flights/airports/iata/{IATA}/{from}/{to}?direction=Departure&withCodeshared=true&withCargo=false&withPrivate=false`
- Window used: `2026-05-16T06:00 → 2026-05-16T18:00` (12 hours, local time at airport)
- Rate limit: 1.2s between calls. On 429, back off 10s and retry (max 5 consecutive failures before abort).
- Resumable: state persisted to `public/raw/aerodatabox-state.json` every 10 airports. Re-running `npm run fetch:adb` skips already-completed origins.
- Output: `public/raw/aerodatabox-routes.json` — `{ routes: {"ORIG|DEST": {operator, codeshares}}, airlines: {...}, covered: [...] }`

## Why we hit the wall

- Free RapidAPI tier (BASIC plan) for AeroDataBox is ~500 API units / month.
- ~300 went into the initial crawl + a long stuck-on-KRR retry loop.
- A few more went into probing during development.
- By the time the user asked about UA→LIS, the monthly quota was gone.
- Quota resets monthly; a new key (free or paid) would unblock more crawling.

## Where to add a new source

The merge logic is structured around the `RouteOut` shape (in `build-data.ts`) and a `routesByOrigin` map. To bolt on a new source (e.g. Wikipedia scraping):

1. Write a fetcher script that outputs JSON in some normalized shape.
2. Add a fourth "Pass" in `build-data.ts` that reads it and emits routes with `source: 'live'` (or a new tag like `'wikipedia'` if you want a third badge).
3. Decide the precedence: should it override OpenFlights? Override AeroDataBox? Or only fill gaps? Update the skip-conditions in Pass 1 and Pass 2 accordingly.
