# Roadmap

Ordered roughly by impact-per-effort. None are scheduled — pick what you want next.

## 0. Housekeeping (do this first)

- **Rotate the exposed RapidAPI key.** A screenshot containing it was shared in chat history. RapidAPI → app `default-application_11936546` → Security → Reset. Update `.env`.

## 1. Better route data — three options, pick one

The fundamental data problem is that AeroDataBox's 12h-window snapshot only catches a fraction of an airline's real network. UA→LIS exists in the dataset but is attributed to TP because UA's actual operating flight departs outside the captured window.

### Option A — Wider AeroDataBox crawl (when quota resets)
- Re-run with a 24-hour window (two 12h calls per airport).
- Or add an arrivals pass (`direction=Arrival`) alongside departures.
- Cost: 2× the API quota per airport, so the covered-airport count halves.
- Time: ~1 hr to refactor `fetch-aerodatabox.ts`.

### Option B — Wikipedia destination scraper
- Each major airline has a "List of [airline] destinations" Wikipedia page with a structured table (city, country, airport, codeshare notes, terminated flag).
- Scrape via Wikipedia's API or `https://en.wikipedia.org/w/api.php?action=parse&page=...`.
- Best free + current source for the top ~100 carriers — explicitly the "where does this airline fly" map.
- Cost: zero quota, just request rate.
- Time: ~3 hrs (parsing varies per airline, need defensive scraping).

### Option C — Accept current state
- Stay on the merged OpenFlights + 273-airport-AeroDataBox dataset.
- It's serviceable but has the gaps noted in `STATUS.md`.

**Recommendation:** B. It's the most honest match to the user's stated goal ("static flight map per airline").

## 2. UI polish

- **Cluster small airports at low zoom** — even with tier-0 hidden, dense regions (Europe, US East Coast) still cluster visually. A real `HexbinLayer` or supercluster-based grouping below zoom 2 would let the user see "density of activity" without the dot soup.
- **Subtle tier color shift** — currently tiers are encoded by size + alpha only, all on the same cool-grey base. A barely-warm white tint for mega-hubs would add a third visual axis. (Originally proposed and deferred — flagged in `STATUS.md`.)
- **Mobile layout** — the right panel currently overflows on screens narrower than ~600px. Move to a bottom-sheet pattern below `md:` breakpoint.
- **Loading skeleton for logos** — image elements pop in. Could pre-fade or show the IATA pill until load.
- **Status bar hint when airport is selected** — currently only renders when there's no selection. Should also explain the route-drill UX the first few times.

## 3. Bigger features

- **Alliance filter** — Star / OneWorld / SkyTeam. Static mapping (~50 airlines). Stacks with the existing airline filter.
- **Aircraft type filter** — AeroDataBox responses include `aircraft.model`. Could augment routes with a "served by" aircraft list.
- **Route distance / flight time display** — great-circle distance from coords; rough block time from a regression. Show in route detail panel.
- **Multi-stop routing** — "How do I get from X to Y if there's no nonstop?" Breadth-first over the routes graph. Out of scope of "static route map" probably.

## 4. Things explicitly out of scope

These came up in earlier discussions and were intentionally left aside.

- Live flight position tracking (Flightradar24 style). The whole project pivoted away from this when the user clarified "I wanted a static map."
- BTS T-100 augmentation for US flights. Considered, then dropped because the BTS download form is JS-gated and AeroDataBox already covered US hubs.
- Self-hosting the basemap tiles. OpenFreeMap is free and reliable enough.

## 5. Open technical questions

- Should the "Live schedule" badge be more prominent? Users might not realize the difference between live and OpenFlights routes.
- Should the airline filter strict mode come back as an option (toggle: "operated only" vs "operated or codeshare")? Currently it's loose-only.
- For the inferred reverse routes (`B→A` from a live `A→B`), should they get a different source tag (`'inferred'`)? Right now they're tagged `'live'` and the user can't tell they're an inference. Honest but a bit noisy.
