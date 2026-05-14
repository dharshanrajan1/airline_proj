import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1).trim()];
    }),
);

const KEY = env.RAPIDAPI_KEY;
const HOST = env.RAPIDAPI_HOST;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const PATHS = [
  '/airports/iata/IAD/stats/routes/daily',
  '/airports/iata/IAD/routes',
  '/airports/iata/IAD/stats/routes',
  '/airports/iata/IAD/routes/daily',
  '/stats/airports/iata/IAD/routes',
  '/airports/iata/IAD/stats',
];

async function probe(path: string) {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOST },
  });
  const text = await res.text();
  return { status: res.status, snippet: text.slice(0, 300) };
}

async function main() {
  for (const p of PATHS) {
    await sleep(1500);
    const { status, snippet } = await probe(p);
    console.log(`${status}  ${p}`);
    if (status === 200) console.log(`  → ${snippet.slice(0, 200)}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
