import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import type { Layer, PickingInfo } from '@deck.gl/core';
import type { Airport, Dataset, Route } from '../types';
import { routeMatchesAirline } from '../lib/route';

const ACCENT: [number, number, number] = [245, 165, 36];
const WHITE: [number, number, number] = [232, 234, 237];
const MUTED: [number, number, number] = [155, 166, 179];
// Darker variants for the light terrain map.
const WHITE_L: [number, number, number] = [20, 40, 80];
const MUTED_L: [number, number, number] = [70, 95, 130];

// Size tier by route count — small / medium / large / mega-hub.
// Buckets chosen from observed distribution (p50=6, p75=16, p90=61).
function airportTier(count: number): 0 | 1 | 2 | 3 {
  if (count >= 120) return 3;
  if (count >= 40) return 2;
  if (count >= 10) return 1;
  return 0;
}

const BASE_RADIUS = [1.8, 2.4, 3.2, 4.5] as const;
const BASE_ALPHA = [70, 130, 180, 230] as const;
// Below this zoom, hide tier-0 (small, <10 routes) airports so the map breathes.
const SMALL_HIDE_ZOOM = 3;

type BuildArgs = {
  data: Dataset;
  selectedAirport: string | null;
  hoverAirport: string | null;
  selectedRoute: { origin: string; dest: string } | null;
  airlineFilter: string | null;
  operatedOnly: boolean;
  domesticOnly: boolean;
  internationalOnly: boolean;
  zoom: number;
  theme: 'dark' | 'light';
  onClickAirport: (iata: string, isDestOfSelected: boolean) => void;
  onHoverAirport: (iata: string | null) => void;
  onClickArc: (origin: string, dest: string) => void;
};

type ArcDatum = {
  origin: Airport;
  dest: Airport;
  airlines: string[];
};

function visibleAirports(data: Dataset, airlineFilter: string | null, hasLive: boolean, zoom: number): Airport[] {
  let pool: Airport[];
  if (!airlineFilter) {
    pool = Object.values(data.airports);
  } else {
    const allowed = new Set<string>();
    for (const [origin, routes] of Object.entries(data.routes)) {
      for (const r of routes) {
        if (routeMatchesAirline(r, airlineFilter, hasLive)) {
          allowed.add(origin);
          allowed.add(r.dest);
        }
      }
    }
    pool = [];
    for (const iata of allowed) {
      const a = data.airports[iata];
      if (a) pool.push(a);
    }
  }
  if (zoom < SMALL_HIDE_ZOOM) {
    return pool.filter((a) => airportTier(a.routeCount) > 0);
  }
  return pool;
}

function arcsForSelection(
  data: Dataset,
  origin: string,
  airlineFilter: string | null,
  hasLive: boolean,
  domesticOnly: boolean,
  internationalOnly: boolean,
): ArcDatum[] {
  const originAirport = data.airports[origin];
  if (!originAirport) return [];
  const routes: Route[] = data.routes[origin] ?? [];
  const out: ArcDatum[] = [];
  for (const r of routes) {
    if (airlineFilter && !routeMatchesAirline(r, airlineFilter, hasLive)) continue;
    const dest = data.airports[r.dest];
    if (!dest) continue;
    const sameCountry = dest.country === originAirport.country;
    if (domesticOnly && !sameCountry) continue;
    if (internationalOnly && sameCountry) continue;
    const carriers = airlineFilter ? [airlineFilter] : r.airlines;
    out.push({ origin: originAirport, dest, airlines: carriers });
  }
  return out;
}

export function buildLayers(args: BuildArgs): Layer[] {
  const {
    data,
    selectedAirport,
    hoverAirport,
    selectedRoute,
    airlineFilter,
    operatedOnly,
    domesticOnly,
    internationalOnly,
    zoom,
    theme,
    onClickAirport,
    onHoverAirport,
    onClickArc,
  } = args;

  const DOT_MUTED = theme === 'light' ? MUTED_L : MUTED;
  const DOT_WHITE = theme === 'light' ? WHITE_L : WHITE;

  const airports = visibleAirports(data, airlineFilter, operatedOnly, zoom);
  const hubs = airlineFilter ? new Set(data.airlineHubs[airlineFilter] ?? []) : new Set<string>();

  const arcs = selectedAirport
    ? arcsForSelection(data, selectedAirport, airlineFilter, operatedOnly, domesticOnly, internationalOnly)
    : [];

  const destSet = new Set<string>();
  for (const a of arcs) destSet.add(a.dest.iata);

  const layers: Layer[] = [];

  // Hub outer ring
  if (airlineFilter && hubs.size > 0) {
    layers.push(
      new ScatterplotLayer<Airport>({
        id: 'hub-rings',
        data: airports.filter((a) => hubs.has(a.iata)),
        getPosition: (a) => [a.lng, a.lat],
        getFillColor: [0, 0, 0, 0],
        getLineColor: [...ACCENT, 90],
        stroked: true,
        getRadius: 9,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        getLineWidth: 1.5,
        pickable: false,
      }),
    );
  }

  // Airport dots
  layers.push(
    new ScatterplotLayer<Airport>({
      id: 'airports',
      data: airports,
      getPosition: (a) => [a.lng, a.lat],
      getRadius: (a) => {
        const tier = airportTier(a.routeCount);
        const base = BASE_RADIUS[tier];
        if (a.iata === selectedAirport) return Math.max(base, 4) + 2;
        if (a.iata === hoverAirport) return base + 1.5;
        if (destSet.has(a.iata)) return base + 0.8;
        if (hubs.has(a.iata)) return base + 0.6;
        return base;
      },
      getFillColor: (a) => {
        const tier = airportTier(a.routeCount);
        const alpha = BASE_ALPHA[tier];
        if (a.iata === selectedAirport) return [...ACCENT, 255];
        if (hubs.has(a.iata)) return [...ACCENT, 230];
        if (destSet.has(a.iata)) return [...DOT_WHITE, 240];
        if (a.iata === hoverAirport) return [...DOT_WHITE, 255];
        return [...DOT_MUTED, alpha];
      },
      radiusUnits: 'pixels',
      pickable: true,
      onClick: (info: PickingInfo) => {
        const obj = info.object as Airport | undefined;
        if (obj) onClickAirport(obj.iata, destSet.has(obj.iata));
      },
      onHover: (info: PickingInfo) => {
        const obj = info.object as Airport | undefined;
        onHoverAirport(obj?.iata ?? null);
      },
      updateTriggers: {
        getRadius: [selectedAirport, hoverAirport, airlineFilter, arcs.length],
        getFillColor: [selectedAirport, hoverAirport, airlineFilter, arcs.length],
        onClick: [selectedAirport, arcs.length],
      },
    }),
  );

  // Arcs
  if (arcs.length > 0) {
    layers.push(
      new ArcLayer<ArcDatum>({
        id: 'arcs',
        data: arcs,
        getSourcePosition: (d) => [d.origin.lng, d.origin.lat],
        getTargetPosition: (d) => [d.dest.lng, d.dest.lat],
        getSourceColor: [...ACCENT, 220],
        getTargetColor: [...ACCENT, 120],
        getWidth: (d) =>
          selectedRoute && d.origin.iata === selectedRoute.origin && d.dest.iata === selectedRoute.dest
            ? 2.8
            : 1.4,
        widthUnits: 'pixels',
        greatCircle: true,
        pickable: true,
        onClick: (info: PickingInfo) => {
          const obj = info.object as ArcDatum | undefined;
          if (obj) onClickArc(obj.origin.iata, obj.dest.iata);
        },
        updateTriggers: {
          getWidth: [selectedRoute],
        },
      }),
    );
  }

  return layers;
}
