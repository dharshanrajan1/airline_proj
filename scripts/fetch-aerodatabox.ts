/**
 * Crawl AeroDataBox departures for the top N airports by route count.
 *
 * Two 12-hour windows per airport for full 24h coverage:
 *   morning  06:00 → 18:00  (catches day flights + most US-domestic)
 *   evening  18:00 → 06:00  (catches transatlantic, overnight, red-eyes)
 *
 * Already-crawled airports only get the missing window — no quota wasted.
 * Resumable: per-window state. Re-running skips completed windows.
 * 204 No Content → permanent no-data list (closed/restricted), never retried.
 * Prints API units remaining after each call so you can monitor quota.
 *
 * Output: public/raw/aerodatabox-routes.json (also written on periodic saves)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RAW_DIR = join(ROOT, 'public', 'raw');
const OUT_FILE = join(RAW_DIR, 'aerodatabox-routes.json');
const STATE_FILE = join(RAW_DIR, 'aerodatabox-state.json');

// ─── Configuration ────────────────────────────────────────────────────────────

const MAX_AIRPORTS = Number(process.env.MAX_AIRPORTS ?? 400);
const DELAY_MS = Number(process.env.DELAY_MS ?? 1200);
// Extra IATAs to crawl beyond top-N (comma-separated), e.g. DAR,JRO,NBO
const EXTRA_AIRPORTS = (process.env.EXTRA_AIRPORTS ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

// Base date for the crawl windows. Override with BASE_DATE env var (YYYY-MM-DD).
const BASE_DATE = process.env.BASE_DATE ?? '2026-05-16';

// Two 12-hour windows covering a full 24h cycle.
const WINDOWS = [
  { id: 'morning', from: `${BASE_DATE}T06:00`, to:  `${BASE_DATE}T18:00` },
  { id: 'evening', from: `${BASE_DATE}T18:00`, to:  `${nextDay(BASE_DATE)}T06:00` },
] as const;

type WindowId = typeof WINDOWS[number]['id'];

// Permanently closed or restricted airports — AeroDataBox has no data for these.
// 204 responses during crawling auto-add to this set and are persisted in state.
const HARDCODED_SKIP = new Set([
  'TXL', // Berlin Tegel — closed Nov 2020
  'SXF', // Berlin Schönefeld — closed Oct 2020 (replaced by BER)
  'NAY', // Beijing Nanyuan — closed Sep 2019 (replaced by PKX)
  'RYG', // Oslo Rygge — closed Nov 2016
  'KBP', // Kyiv Boryspil — no AeroDataBox data (war zone restrictions)
]);

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Departure = {
  arrival?: { airport?: { iata?: string } };
  airline?: { iata?: string; icao?: string; name?: string };
  codeshareStatus?: 'IsOperator' | 'IsCodeshared' | 'Unknown';
  isCargo?: boolean;
};

type FlightsResponse = { departures?: Departure[] };

type RouteEntry = { operator: string | null; codeshares: Set<string> };

type State = {
  // iata → list of completed window IDs
  completed: Record<string, WindowId[]>;
  // airports that returned 204 — permanently no data
  nodata: string[];
  failed: { iata: string; status: number; window: string }[];
  routes: Record<string, { operator: string | null; codeshares: string[] }>;
  airlines: Record<string, { iata: string; name: string; icao?: string }>;
};

// ─── Env ─────────────────────────────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const txt = readFileSync(join(ROOT, '.env'), 'utf8');
  const out: Record<string, string> = {};
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = loadEnv();
const KEY = env.RAPIDAPI_KEY;
const HOST = env.RAPIDAPI_HOST;

// ─── State I/O ────────────────────────────────────────────────────────────────

function loadState(): State {
  if (!existsSync(STATE_FILE)) {
    return { completed: {}, nodata: [], failed: [], routes: {}, airlines: {} };
  }
  const raw = JSON.parse(readFileSync(STATE_FILE, 'utf8'));

  // Migrate old format: completed was a flat string[] (all morning-only).
  if (Array.isArray(raw.completed)) {
    console.log(`Migrating old state: ${raw.completed.length} airports → per-window format`);
    const migrated: Record<string, WindowId[]> = {};
    for (const iata of raw.completed as string[]) migrated[iata] = ['morning'];
    raw.completed = migrated;
  }

  return { nodata: [], airlines: {}, failed: [], ...raw };
}

function saveState(state: State, routeMap: Map<string, RouteEntry>) {
  const serialized = serializeState(state, routeMap);
  writeFileSync(STATE_FILE, JSON.stringify(serialized, null, 2));

  // Also keep aerodatabox-routes.json current so build-data works after interruptions.
  // `covered` = any airport with at least one crawled window (build-data uses this to
  // prefer live data over OpenFlights). `fullyCovered` = airports with all windows done.
  const output = {
    routes: serialized.routes,
    airlines: state.airlines,
    covered: Object.keys(state.completed).sort(),
    fullyCovered: Object.keys(state.completed).filter(
      iata => state.completed[iata].length === WINDOWS.length
    ).sort(),
    windows: WINDOWS.map(w => ({ id: w.id, from: w.from, to: w.to })),
  };
  writeFileSync(OUT_FILE, JSON.stringify(output));
}

function serializeState(state: State, routeMap: Map<string, RouteEntry>): State {
  return { ...state, routes: serializeRoutes(routeMap) };
}

function serializeRoutes(routeMap: Map<string, RouteEntry>) {
  const out: Record<string, { operator: string | null; codeshares: string[] }> = {};
  for (const [key, val] of routeMap) {
    out[key] = { operator: val.operator, codeshares: [...val.codeshares].sort() };
  }
  return out;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type FetchResult = {
  status: number;
  data?: FlightsResponse;
  unitsRemaining?: number;
};

async function fetchDepartures(iata: string, from: string, to: string): Promise<FetchResult> {
  const url =
    `https://${HOST}/flights/airports/iata/${iata}/${from}/${to}` +
    `?direction=Departure&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false`;
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOST },
  });
  const unitsRemaining = Number(res.headers.get('x-ratelimit-api-units-remaining') ?? NaN);
  if (res.status !== 200) return { status: res.status, unitsRemaining };
  const data = (await res.json()) as FlightsResponse;
  return { status: 200, data, unitsRemaining };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });

  const airports: Record<string, { iata: string; routeCount: number }> = JSON.parse(
    readFileSync(join(ROOT, 'public', 'data', 'airports.json'), 'utf8'),
  );

  // Rank by route count, exclude hardcoded skips.
  const ranked = Object.values(airports)
    .filter(a => !HARDCODED_SKIP.has(a.iata))
    .sort((a, b) => b.routeCount - a.routeCount)
    .slice(0, MAX_AIRPORTS)
    .map(a => a.iata);

  // Append extra airports (deduplicated).
  const rankedSet = new Set(ranked);
  for (const iata of EXTRA_AIRPORTS) {
    if (!rankedSet.has(iata) && !HARDCODED_SKIP.has(iata)) {
      ranked.push(iata);
      rankedSet.add(iata);
    }
  }

  const state = loadState();
  const nodataSet = new Set([...HARDCODED_SKIP, ...state.nodata]);

  // Rehydrate route map from persisted state.
  const routeMap = new Map<string, RouteEntry>();
  for (const [key, val] of Object.entries(state.routes)) {
    routeMap.set(key, { operator: val.operator, codeshares: new Set(val.codeshares) });
  }

  // Build work queue: (iata, window) pairs not yet completed.
  type WorkItem = { iata: string; window: typeof WINDOWS[number] };
  const todo: WorkItem[] = [];
  for (const iata of ranked) {
    if (nodataSet.has(iata)) continue;
    const done = new Set(state.completed[iata] ?? []);
    for (const w of WINDOWS) {
      if (!done.has(w.id)) todo.push({ iata, window: w });
    }
  }

  const totalAirports = ranked.filter(i => !nodataSet.has(i)).length;
  console.log(`\nAirports in scope: ${totalAirports} (${EXTRA_AIRPORTS.length} extras)`);
  console.log(`Work items remaining: ${todo.length} (each = 1 API unit)`);
  console.log(`Windows: ${WINDOWS.map(w => `${w.id} (${w.from} → ${w.to})`).join(', ')}\n`);

  let consecutiveFailures = 0;
  let lastUnitsRemaining: number | undefined;

  for (let i = 0; i < todo.length; i++) {
    const { iata, window: win } = todo[i];
    await sleep(DELAY_MS);

    try {
      const { status, data, unitsRemaining } = await fetchDepartures(iata, win.from, win.to);
      if (unitsRemaining !== undefined) {
        lastUnitsRemaining = unitsRemaining;
        if (unitsRemaining <= 20 && unitsRemaining > 0) {
          console.warn(`\n  *** LOW QUOTA WARNING: ${unitsRemaining} units remaining ***\n`);
        }
      }

      const unitsLabel = lastUnitsRemaining !== undefined ? ` [${lastUnitsRemaining} units left]` : '';

      if (status === 429) {
        consecutiveFailures++;
        if (consecutiveFailures >= 5) {
          // 5 consecutive 429s = quota exhausted, not just a momentary rate limit.
          console.error('\nQuota exhausted (5 consecutive 429s). Saving state and exiting.');
          console.error('Re-run next month when quota resets, or with a new key.');
          saveState(state, routeMap);
          process.exit(0);
        }
        console.warn(`  ${iata}/${win.id}: rate-limited, backing off 10s (${consecutiveFailures}/5)`);
        await sleep(10000);
        i--;
        continue;
      }

      // 204 = airport has no flight data in AeroDataBox (closed/restricted).
      // Permanently skip — don't waste future quota on it.
      if (status === 204) {
        if (!state.nodata.includes(iata)) state.nodata.push(iata);
        nodataSet.add(iata);
        console.warn(`  ${iata}: 204 No Content — added to permanent skip list${unitsLabel}`);
        consecutiveFailures = 0;
        continue;
      }

      if (status !== 200 || !data) {
        state.failed.push({ iata, status, window: win.id });
        consecutiveFailures++;
        console.warn(`  ${iata}/${win.id}: HTTP ${status}${unitsLabel}`);
        if (consecutiveFailures >= 5) {
          console.error('5 consecutive failures — aborting. Re-run to resume.');
          saveState(state, routeMap);
          process.exit(1);
        }
        continue;
      }

      consecutiveFailures = 0;
      const departures = data.departures ?? [];
      let newRoutes = 0;

      for (const dep of departures) {
        if (dep.isCargo) continue;
        const dest = dep.arrival?.airport?.iata;
        const carrier = dep.airline?.iata;
        if (!dest || !carrier) continue;

        // Accumulate airline metadata.
        if (dep.airline?.name && !state.airlines[carrier]) {
          state.airlines[carrier] = { iata: carrier, name: dep.airline.name, icao: dep.airline.icao };
        }

        const key = `${iata}|${dest}`;
        let entry = routeMap.get(key);
        if (!entry) {
          entry = { operator: null, codeshares: new Set() };
          routeMap.set(key, entry);
          newRoutes++;
        }

        // Union operator/codeshare across both windows.
        // If morning said operator=X and evening confirms it, fine.
        // If evening reveals a different operator, last-write wins (acceptable).
        if (dep.codeshareStatus === 'IsOperator') {
          entry.operator = carrier;
        } else {
          entry.codeshares.add(carrier);
        }
      }

      // Mark this window done for this airport.
      if (!state.completed[iata]) state.completed[iata] = [];
      if (!state.completed[iata].includes(win.id)) state.completed[iata].push(win.id);

      const progress = `[${i + 1}/${todo.length}]`;
      console.log(`  ${progress} ${iata}/${win.id}: +${newRoutes} routes (${departures.length} flights)${unitsLabel}`);

    } catch (err) {
      consecutiveFailures++;
      state.failed.push({ iata, status: -1, window: win.id });
      console.warn(`  ${iata}/${win.id}: network error`, err);
    }

    // Persist every 10 work items (also writes aerodatabox-routes.json).
    if ((i + 1) % 10 === 0 || i === todo.length - 1) {
      saveState(state, routeMap);
    }
  }

  saveState(state, routeMap);

  const fullyCovered = Object.keys(state.completed).filter(
    iata => state.completed[iata].length === WINDOWS.length
  );
  const partiallyCovered = Object.keys(state.completed).filter(
    iata => state.completed[iata].length < WINDOWS.length
  );

  console.log(`\nDone.`);
  console.log(`  Fully covered (both windows): ${fullyCovered.length} airports`);
  console.log(`  Partially covered (morning only): ${partiallyCovered.length} airports`);
  console.log(`  No-data (permanent skip): ${state.nodata.length} airports`);
  console.log(`  Unique route pairs: ${routeMap.size}`);
  console.log(`  Airlines discovered: ${Object.keys(state.airlines).length}`);
  if (lastUnitsRemaining !== undefined) console.log(`  API units remaining: ${lastUnitsRemaining}`);
  console.log(`\nWrote ${OUT_FILE}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
