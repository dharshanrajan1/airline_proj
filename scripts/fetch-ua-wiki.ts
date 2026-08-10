// Scrapes Wikipedia destination tables for United Airlines hubs.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const UA_HUBS: Record<string, string> = {
  EWR: 'Newark Liberty International Airport',
  ORD: "O'Hare International Airport",
  IAH: 'George Bush Intercontinental Airport',
  DEN: 'Denver International Airport',
  SFO: 'San Francisco International Airport',
  IAD: 'Washington Dulles International Airport',
  LAX: 'Los Angeles International Airport',
};

async function fetchPageHtml(title: string): Promise<string> {
  const url =
    'https://en.wikipedia.org/w/api.php?action=parse&prop=text&format=json&redirects=1' +
    `&page=${encodeURIComponent(title)}&disablelimitreport=1&disableeditsection=1`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AirlineRouteExplorer/1.0 (student-project)',
    },
  });
  if (!res.ok) throw new Error(`Wikipedia API ${res.status} for "${title}"`);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (rate-limited?): ${text.slice(0, 80)}`);
  }
  const html = (json as { parse?: { text?: { '*': string } } }).parse?.text?.['*'];
  if (!html) throw new Error(`No HTML in response for "${title}"`);
  return html;
}

// Build lookup from normalized airport name to IATA.
function buildNameMap(airports: Record<string, { name: string }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [iata, a] of Object.entries(airports)) {
    const key = normalizeName(a.name);
    if (!map.has(key)) map.set(key, iata);
  }
  return map;
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—]/g, '-')   // normalize Unicode dashes to ASCII
    .replace(/'/g, "'")       // normalize smart quotes
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract UA destination IATAs from Wikipedia HTML.
function extractUADestinations(
  html: string,
  nameMap: Map<string, string>,
  hub: string,
): string[] {
  const iatas = new Set<string>();
  let inUABlock = false;

  for (const trMatch of html.matchAll(/<tr[\s\S]*?<\/tr>/g)) {
    const tr = trMatch[0];
    const plainText = tr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    if (/United Express/i.test(plainText)) {
      inUABlock = false;
      continue;
    }

    if (/United Airlines/i.test(plainText)) {
      inUABlock = true;
    } else if (inUABlock) {
      // Another airline row terminates the block.
      if (
        /\b(Airlines|Airways|Air Lines|Express|Jet Airways|Jets?)\b/i.test(plainText) &&
        !/United/i.test(plainText)
      ) {
        inUABlock = false;
      }
    }

    if (!inUABlock) continue;

    for (const [, rawTitle] of tr.matchAll(/title="([^"]+)"/g)) {
      if (!/airport|aeroporto|aéroport|flughafen|aeropuerto|havalimanı/i.test(rawTitle)) continue;
      const iata = nameMap.get(normalizeName(rawTitle));
      if (iata && iata !== hub) iatas.add(iata);
    }
  }

  return [...iatas];
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function main() {
  const airportsPath = join(__dirname, '..', 'public', 'data', 'airports.json');
  if (!existsSync(airportsPath)) {
    console.error('airports.json not found — run "npm run build:data" first.');
    process.exit(1);
  }
  const airports = JSON.parse(readFileSync(airportsPath, 'utf8')) as Record<
    string,
    { name: string }
  >;
  const nameMap = buildNameMap(airports);
  console.log(`Built name map for ${nameMap.size} airports\n`);

  const routes: Record<string, boolean> = {};

  for (const [hub, title] of Object.entries(UA_HUBS)) {
    console.log(`Fetching ${hub} — "${title}"…`);
    try {
      const html = await fetchPageHtml(title);
      const dests = extractUADestinations(html, nameMap, hub);
      console.log(`  → ${dests.length} UA destinations: ${dests.sort().join(', ')}`);
      for (const dest of dests) routes[`${hub}|${dest}`] = true;
    } catch (err) {
      console.error(`  ERROR: ${(err as Error).message}`);
    }
    // Polite crawl — generous gap to avoid 429s.
    await sleep(5000);
  }

  const outPath = join(__dirname, '..', 'public', 'raw', 'ua-wiki-routes.json');
  writeFileSync(outPath, JSON.stringify({ routes, scraped_at: new Date().toISOString() }, null, 2));

  const total = Object.keys(routes).length;
  console.log(`\nSaved ${total} UA route pairs to public/raw/ua-wiki-routes.json`);
  console.log('Next step: npm run build:data');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
