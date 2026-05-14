/**
 * One-off probe: discover the shape of AeroDataBox's airport-flights endpoint.
 * Calls the balance endpoint and one airport-flights call, logs the response.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const txt = readFileSync(join(__dirname, '..', '.env'), 'utf8');
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

async function call(path: string) {
  const url = `https://${HOST}${path}`;
  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOST },
  });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 3000) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Probe one flights endpoint; one request only, ample wait first.
  await sleep(2000);
  const from = '2026-05-15T08:00';
  const to = '2026-05-15T20:00';
  console.log(`--- flights LHR ${from} → ${to} ---`);
  const flights = await call(
    `/flights/airports/iata/LHR/${from}/${to}?withLeg=true&direction=Departure&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false`,
  );
  console.log('status:', flights.status);
  console.log('body (truncated):', flights.body);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
