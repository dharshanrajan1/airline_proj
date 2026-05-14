# Airline Map Project - Gap Analysis

This document outlines a thorough gap analysis of the current application state, categorized by severity and feasibility.

## 1. Serious Errors & Data Gaps (Critical Priority)

These are underlying flaws in the logic or data pipeline that will result in wrong information or a broken user experience.

* **Stale Baseline Data (OpenFlights):** 
  * *The Gap:* The `build-data.ts` script fetches its baseline data from OpenFlights. OpenFlights has largely been abandoned and its route data reflects the aviation world circa 2014. You will see defunct airlines (e.g., Virgin America) and missing modern routes.
  * *The Fix:* While the `AeroDataBox` overlay script helps patch this for covered origins, the underlying OpenFlights data should ideally be replaced by a more modern, maintained CSV source (like OurAirports for airports, and scraping a more recent database for routes).
* **Missing Direct Flights (Stops Logic):**
  * *The Gap:* In `build-data.ts`, line 116 (`if (stops !== '0') continue;`) brutally drops any flight with a stop. Many legitimate direct flights (especially on Southwest Airlines) have a brief layover but keep the same flight number and plane. This logic artificially shrinks the network.
* **CSV Parsing Edge Cases:**
  * *The Gap:* The custom `parseCSVLine` function in `build-data.ts` will fail if the OpenFlights data ever introduces escaped quotes inside already quoted strings.
  * *The Fix:* Replace the manual loop with a proven, robust npm package like `csv-parse`.
* **Mobile UI Breakage:**
  * *The Gap:* `Panel.tsx` uses a fixed 340px width and is anchored to the right. On mobile devices, it will permanently cover the `Filters.tsx` component on the left, rendering the app unusable.

## 2. Nice-to-Have Features (Medium Priority)

These features fix UX annoyances and polish the overall experience for a production launch.

* **"Route Drilling" Navigation:**
  * *The Gap:* Clicking a destination currently jumps the origin to that new airport.
  * *The Fix:* Change the destination click behavior to lock onto the specific route (e.g., JFK → LAX) and display the operating airlines, rather than jumping the map. Include an "Explore flights from here" button to set new origins.
* **Loading State & Data Initialization:**
  * *The Gap:* `useLoadData()` runs silently in the background. Users on slower connections stare at a blank map for seconds without knowing if the app is broken.
  * *The Fix:* Implement a global glassmorphic loading spinner/overlay until the JSON files are fully parsed.
* **Search Performance Optimization:**
  * *The Gap:* In `Filters.tsx`, typing in the search bar triggers `Object.values(data.airports)` on every keystroke. For 5,000+ airports, this causes micro-stutters.
  * *The Fix:* Precompute the airport and airline arrays once on application load and store them in `store.ts`.
* **Fix `setTimeout` Dropdown Hack:**
  * *The Gap:* `Filters.tsx` uses a 120ms timeout to close the search dropdown on blur, which is a React anti-pattern that can cause missed clicks on slow devices.
  * *The Fix:* Use a `useOnClickOutside` hook.

## 3. Cool Additions (Ranked by Feasibility)

These are features that elevate the app to a premium, "wow-factor" status.

### Rank 1: Map Controls (High Feasibility / Low Effort)
* *Idea:* Add `+` / `-` zoom buttons to the map.
* *Why:* Currently, desktop users without trackpads have a hard time zooming. Maplibre has a built-in `NavigationControl` that takes 1 line of code to add.

### Rank 2: 3D Globe Projection (High Feasibility / Medium Effort)
* *Idea:* Replace the flat Mercator map with a 3D spinning globe.
* *Why:* Flat maps heavily distort long-haul global flights. A 3D globe looks incredibly premium.
* *How:* Maplibre doesn't natively support globes, but Deck.gl has a pure `_GlobeView` that can replace the underlying map engine entirely.

### Rank 3: Animated Flight Arcs (Medium Feasibility / Medium Effort)
* *Idea:* Show planes/particles moving along the route arcs.
* *Why:* Makes the map feel alive rather than like a static textbook.
* *How:* Swap the Deck.gl `ArcLayer` for a `TripsLayer`, or use an animated shader to send pulses of light from the origin to the destination.

### Rank 4: Live Flight Tracking (Low Feasibility / High Effort)
* *Idea:* Real-time, moving airplanes based on actual live data.
* *Why:* The ultimate dashboard experience.
* *How:* Requires setting up a Node.js/Vite backend proxy to poll the free OpenSky Network API, mapping the live coordinates to a Deck.gl `IconLayer`, and interpolating the movement so the planes glide smoothly across the screen.
