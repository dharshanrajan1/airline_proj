import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'data');

const AIRPORTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
const AIRLINES_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat';
const ROUTES_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat';

// OpenFlights uses CSV with double-quoted strings and \N for null.
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => (s === '\\N' ? '' : s));
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  routeCount: number;
};

type Airline = { iata: string; name: string; country: string; logoUrl?: string };

const LOGO_MANIFEST = 'https://data.jsdelivr.com/v1/package/gh/urbullet/iata-airelines-logos@master/flat';
const LOGO_BASE = 'https://cdn.jsdelivr.net/gh/urbullet/iata-airelines-logos@master/scripts/airlines-logos';
// urbullet repo serves a generic placeholder PNG for unknown IATAs; placeholder is always exactly this size.
const PLACEHOLDER_SIZE = 8714;

async function fetchLogoManifest(): Promise<Set<string>> {
  const res = await fetch(LOGO_MANIFEST);
  if (!res.ok) throw new Error(`logo manifest fetch failed: ${res.status}`);
  const data = (await res.json()) as { files: Array<{ name: string; size: number }> };
  const present = new Set<string>();
  for (const f of data.files) {
    const m = f.name.match(/\/scripts\/airlines-logos\/([A-Z0-9]{2})\.png$/);
    if (m && f.size !== PLACEHOLDER_SIZE) present.add(m[1]);
  }
  return present;
}

type RouteOut = {
  dest: string;
  airlines: string[];
  operator?: string | null;
  codeshares?: string[];
  source: 'live' | 'openflights';
};

type RoutesByOrigin = Record<string, RouteOut[]>;

type AeroDataBoxFile = {
  routes: Record<string, { operator: string | null; codeshares: string[] }>;
  airlines: Record<string, { iata: string; name: string; icao?: string }>;
  covered: string[];
};

async function main() {
  console.log('Fetching OpenFlights data…');
  const [airportsTxt, airlinesTxt, routesTxt] = await Promise.all([
    fetchText(AIRPORTS_URL),
    fetchText(AIRLINES_URL),
    fetchText(ROUTES_URL),
  ]);

  const airportsByIata = new Map<string, Airport>();
  for (const line of airportsTxt.split('\n')) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    const iata = cols[4];
    const lat = parseFloat(cols[6]);
    const lng = parseFloat(cols[7]);
    if (!iata || iata.length !== 3 || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    airportsByIata.set(iata, {
      iata,
      name: cols[1],
      city: cols[2],
      country: cols[3],
      lat,
      lng,
      routeCount: 0,
    });
  }
  console.log(`  airports parsed: ${airportsByIata.size}`);

  const airlinesByIata = new Map<string, Airline>();
  for (const line of airlinesTxt.split('\n')) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    const iata = cols[3];
    const active = cols[7] === 'Y';
    if (!iata || iata.length !== 2 || !active) continue;
    if (!airlinesByIata.has(iata)) {
      airlinesByIata.set(iata, { iata, name: cols[1], country: cols[6] });
    }
  }
  console.log(`  active airlines parsed: ${airlinesByIata.size}`);

  // Build routes: dedupe per origin-dest, collect carriers.
  const routesByPair = new Map<string, Set<string>>();
  for (const line of routesTxt.split('\n')) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    const airline = cols[0];
    const origin = cols[2];
    const dest = cols[4];
    const stops = cols[7];
    if (stops !== '0') continue;
    if (!origin || !dest || origin === dest) continue;
    if (!airportsByIata.has(origin) || !airportsByIata.has(dest)) continue;
    // Only keep airlines we have IATA codes for
    if (!airlinesByIata.has(airline)) continue;
    const key = `${origin}|${dest}`;
    let set = routesByPair.get(key);
    if (!set) {
      set = new Set();
      routesByPair.set(key, set);
    }
    set.add(airline);
  }
  console.log(`  unique nonstop routes: ${routesByPair.size}`);

  // Optional AeroDataBox overlay (replaces OpenFlights for covered origins).
  const adbPath = join(__dirname, '..', 'public', 'raw', 'aerodatabox-routes.json');
  let adb: AeroDataBoxFile | null = null;
  const coveredOrigins = new Set<string>();
  if (existsSync(adbPath)) {
    adb = JSON.parse(readFileSync(adbPath, 'utf8')) as AeroDataBoxFile;
    // Only treat an airport as "covered" if it actually has outbound ADB routes.
    // Airports that were crawled but returned empty schedules (failed window, off-peak
    // slot, or API gap) should fall back to OpenFlights rather than silently showing
    // zero routes — the `covered` array can include such empty-crawl airports.
    for (const key of Object.keys(adb.routes)) coveredOrigins.add(key.split('|')[0]);
    console.log(`  AeroDataBox overlay: ${adb.covered.length} crawled, ${coveredOrigins.size} with routes, ${Object.keys(adb.routes).length} route pairs`);
  } else {
    console.log('  AeroDataBox overlay: not found (run npm run fetch:adb)');
  }

  const routesByOrigin: RoutesByOrigin = {};
  const usedAirports = new Set<string>();
  const usedAirlines = new Set<string>();

  // 1. OpenFlights routes — but only for origins NOT covered by AeroDataBox.
  for (const [key, carriers] of routesByPair) {
    const [origin, dest] = key.split('|');
    if (coveredOrigins.has(origin)) continue;
    if (!airportsByIata.has(dest)) continue;
    usedAirports.add(origin);
    usedAirports.add(dest);
    carriers.forEach((c) => usedAirlines.add(c));
    if (!routesByOrigin[origin]) routesByOrigin[origin] = [];
    routesByOrigin[origin].push({ dest, airlines: [...carriers].sort(), source: 'openflights' });
  }

  // 2. AeroDataBox routes — replace for covered origins.
  if (adb) {
    for (const [pairKey, info] of Object.entries(adb.routes)) {
      const [origin, dest] = pairKey.split('|');
      if (!coveredOrigins.has(origin)) continue;
      if (!airportsByIata.has(dest)) continue;
      usedAirports.add(origin);
      usedAirports.add(dest);
      const carriers = new Set<string>();
      if (info.operator) carriers.add(info.operator);
      for (const c of info.codeshares) carriers.add(c);
      carriers.forEach((c) => usedAirlines.add(c));
      if (!routesByOrigin[origin]) routesByOrigin[origin] = [];
      routesByOrigin[origin].push({
        dest,
        airlines: [...carriers].sort(),
        operator: info.operator,
        codeshares: info.codeshares,
        source: 'live',
      });
    }
  }

  // 3. Inferred reverse routes from live data.
  //    For each live A→B where B was NOT crawled as an origin, append B→A as live (commercial
  //    routes effectively always round-trip, so this is a safe inference and fixes the
  //    "click LIH with UA filter → 0 routes" problem for non-covered destinations.)
  if (adb) {
    let inferred = 0;
    for (const [pairKey, info] of Object.entries(adb.routes)) {
      const [origin, dest] = pairKey.split('|');
      if (coveredOrigins.has(dest)) continue;
      if (!airportsByIata.has(origin) || !airportsByIata.has(dest)) continue;
      if (!routesByOrigin[dest]) routesByOrigin[dest] = [];
      // Drop any OpenFlights entry for dest→origin; the inferred live record is better.
      const existing = routesByOrigin[dest].findIndex((r) => r.dest === origin);
      if (existing >= 0) routesByOrigin[dest].splice(existing, 1);
      const carriers = new Set<string>();
      if (info.operator) carriers.add(info.operator);
      for (const c of info.codeshares) carriers.add(c);
      carriers.forEach((c) => usedAirlines.add(c));
      routesByOrigin[dest].push({
        dest: origin,
        airlines: [...carriers].sort(),
        operator: info.operator,
        codeshares: info.codeshares,
        source: 'live',
      });
      usedAirports.add(dest);
      usedAirports.add(origin);
      inferred++;
    }
    console.log(`  inferred reverse routes (live, dest not crawled): ${inferred}`);
  }

  // Step 3b. Symmetric covered→covered live routes.
  // Step 3 only infers reverses when dest is NOT covered. When both endpoints are covered,
  // each airport's crawl windows may have captured only one direction (e.g. SYD has SYD→SFO
  // but SFO's crawl missed SFO→SYD). Patch by adding any missing reverse for all live pairs.
  if (adb) {
    let patched = 0;
    for (const [pairKey, info] of Object.entries(adb.routes)) {
      const [origin, dest] = pairKey.split('|');
      if (!coveredOrigins.has(dest)) continue; // already handled in step 3
      if (!airportsByIata.has(origin) || !airportsByIata.has(dest)) continue;
      const hasReverse = routesByOrigin[dest]?.some((r) => r.dest === origin);
      if (hasReverse) continue;
      const carriers = new Set<string>();
      if (info.operator) carriers.add(info.operator);
      for (const c of info.codeshares) carriers.add(c);
      carriers.forEach((c) => usedAirlines.add(c));
      if (!routesByOrigin[dest]) routesByOrigin[dest] = [];
      routesByOrigin[dest].push({
        dest: origin,
        airlines: [...carriers].sort(),
        operator: info.operator,
        codeshares: info.codeshares,
        source: 'live',
      });
      usedAirports.add(dest);
      usedAirports.add(origin);
      patched++;
    }
    console.log(`  patched covered↔covered missing reverses: ${patched}`);
  }

  // UA wiki overlay — patches routes that ADB crawl missed (seasonal, schedule gaps).
  const uaWikiPath = join(__dirname, '..', 'public', 'raw', 'ua-wiki-routes.json');
  if (existsSync(uaWikiPath)) {
    const uaWiki = JSON.parse(readFileSync(uaWikiPath, 'utf8')) as {
      routes: Record<string, boolean>;
    };
    let added = 0;
    let augmented = 0;

    // Helper: upsert UA into a route pair, returns true if anything changed.
    function upsertUA(origin: string, dest: string): boolean {
      if (!airportsByIata.has(origin) || !airportsByIata.has(dest)) return false;
      usedAirports.add(origin);
      usedAirports.add(dest);
      usedAirlines.add('UA');
      const existing = routesByOrigin[origin]?.find((r) => r.dest === dest);
      if (existing) {
        if (!existing.airlines.includes('UA')) {
          existing.airlines.push('UA');
          existing.airlines.sort();
          augmented++;
        }
        return false;
      }
      if (!routesByOrigin[origin]) routesByOrigin[origin] = [];
      routesByOrigin[origin].push({ dest, airlines: ['UA'], source: 'openflights' });
      added++;
      return true;
    }

    for (const pairKey of Object.keys(uaWiki.routes)) {
      const [origin, dest] = pairKey.split('|');
      upsertUA(origin, dest);
      // Commercial routes are always bidirectional — add the reverse too.
      upsertUA(dest, origin);
    }
    console.log(`  UA wiki overlay: ${added} new routes added, ${augmented} routes augmented with UA`);
  }

  for (const list of Object.values(routesByOrigin)) {
    list.sort((a, b) => a.dest.localeCompare(b.dest));
  }

  // Augment airlines map with AeroDataBox-discovered ones.
  if (adb) {
    for (const [iata, info] of Object.entries(adb.airlines)) {
      if (!airlinesByIata.has(iata) && info.name) {
        airlinesByIata.set(iata, { iata, name: info.name, country: '' });
      }
    }
  }

  // Route counts (outbound + inbound, unique pairs) — across both sources.
  const routeCounts = new Map<string, number>();
  for (const [origin, list] of Object.entries(routesByOrigin)) {
    for (const r of list) {
      routeCounts.set(origin, (routeCounts.get(origin) ?? 0) + 1);
      routeCounts.set(r.dest, (routeCounts.get(r.dest) ?? 0) + 1);
    }
  }

  const airports: Record<string, Airport> = {};
  for (const iata of usedAirports) {
    const a = airportsByIata.get(iata);
    if (a) airports[iata] = { ...a, routeCount: routeCounts.get(iata) ?? 0 };
  }

  console.log('Fetching logo manifest…');
  const logoSet = await fetchLogoManifest();
  console.log(`  logo manifest: ${logoSet.size} airlines`);

  const airlines: Record<string, Airline> = {};
  for (const iata of usedAirlines) {
    const a = airlinesByIata.get(iata);
    if (!a) continue;
    airlines[iata] = logoSet.has(iata) ? { ...a, logoUrl: `${LOGO_BASE}/${iata}.png` } : a;
  }

  // Hubs: top N airports per airline by outbound route count (from merged data).
  const HUB_COUNT = 6;
  const hubCounts = new Map<string, Map<string, number>>();
  for (const [origin, list] of Object.entries(routesByOrigin)) {
    for (const r of list) {
      for (const airline of r.airlines) {
        let m = hubCounts.get(airline);
        if (!m) {
          m = new Map();
          hubCounts.set(airline, m);
        }
        m.set(origin, (m.get(origin) ?? 0) + 1);
      }
    }
  }
  const airlineHubs: Record<string, string[]> = {};
  for (const [airline, counts] of hubCounts) {
    airlineHubs[airline] = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, HUB_COUNT)
      .map(([iata]) => iata);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'airports.json'), JSON.stringify(airports));
  writeFileSync(join(OUT_DIR, 'airlines.json'), JSON.stringify(airlines));
  writeFileSync(join(OUT_DIR, 'routes.json'), JSON.stringify(routesByOrigin));
  writeFileSync(join(OUT_DIR, 'airlineHubs.json'), JSON.stringify(airlineHubs));

  console.log(`\nWrote:`);
  console.log(`  airports.json: ${Object.keys(airports).length} airports`);
  console.log(`  airlines.json: ${Object.keys(airlines).length} airlines`);
  console.log(`  routes.json:   ${Object.keys(routesByOrigin).length} origins`);
  console.log(`  airlineHubs.json: ${Object.keys(airlineHubs).length} airlines`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
