# Airline Map Project - Technical Roadmap & Architecture

This document outlines the planned technical upgrades, UX improvements, and architectural changes for the Airline Map application.

## 1. UI & UX Refinements (Phase 1)
The application currently features a solid glassmorphic design and high-performance Deck.gl rendering. The following fixes will stabilize the UX:
- **Prevent Scroll Bleed:** Stop wheel and touch event propagation in `Panel.tsx` so scrolling lists don't accidentally zoom the map underneath.
- **Robust Dropdowns:** Replace the 120ms `setTimeout` hack in `Filters.tsx` with a `useOnClickOutside` hook to ensure reliable dropdown selections.
- **Map Controls:** Add a Maplibre Navigation Control (`+`/`-`) to ensure users without trackpads can easily zoom the map.
- **Loading State:** Implement a global loading overlay while the initial `.json` data files are fetched via `useLoadData()`.

## 2. "Route Drilling" Navigation Paradigm
To better surface rich route data (operating airlines, codeshares), the navigation flow will be updated:
- **Current (Node Jumping):** Clicking a destination airport immediately sets it as the new origin.
- **Proposed (Route Drilling):** Clicking a destination airport while an origin is active locks the view onto the specific route (e.g., JFK → LAX). The side panel will display the operators for that specific flight.
- **Resetting Origin:** To escape the route view, users can click an "Explore flights from here" button in the panel, or click any empty space on the map to trigger `clearSelection()`.

## 3. Live Flight Tracking Architecture
To elevate the app from a static encyclopedia to a dynamic dashboard, live flight tracking will be integrated using the **OpenSky Network API** (free, community-driven ADS-B data).

### Implementation Requirements:
1. **Backend Proxy / Poller:** 
   - A serverless function or lightweight Node/Express backend is required to proxy requests to the OpenSky API.
   - The backend will poll OpenSky every ~10 seconds and cache the global state to prevent rate-limiting and IP bans.
2. **Frontend React Polling:**
   - A `useInterval` hook in `Map.tsx` will fetch the cached live data from the proxy every 5-10 seconds.
3. **Deck.gl IconLayer:**
   - Add an `IconLayer` to `layers.ts` to render airplane SVGs on the map.
   - Bind the live heading to the icon's rotation so planes face their direction of travel.
   - Implement interpolation/easing so planes glide smoothly between polled coordinates rather than snapping.
4. **Interactive Live Tooltips:**
   - Map hover/click events on the `IconLayer` to surface flight metadata (Callsign, Altitude, Velocity).
