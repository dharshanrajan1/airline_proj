import type { StyleSpecification } from 'maplibre-gl';

// ── Dark theme ───────────────────────────────────────────────────────────────
const LAND   = '#0e1116';
const WATER  = '#070a0e';
const BORDER = '#222a36';
const LABEL  = '#5b6470';
const CITY   = '#4a5460';

// ── Light / terrain theme ────────────────────────────────────────────────────
const LAND_L        = '#E8E2D9';
const WATER_L       = '#BAD4E8';
const BORDER_L      = '#C4B5A0';
const LABEL_L       = '#6B5A48';   // country labels
const STATE_L       = '#A09080';   // state / province labels
const CITY_L        = '#3D3028';   // city labels
const ROAD_HWY_L    = '#D4C4B0';   // motorway / trunk
const ROAD_PRI_L    = '#DDD6CC';   // primary roads

// ── Shared layer factories ────────────────────────────────────────────────────

function cityLabels(color: string, halo: string): StyleSpecification['layers'][0] {
  return {
    id: 'city-labels',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['==', ['get', 'class'], 'city'],
    minzoom: 2,
    layout: {
      'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 5, 12, 8, 15],
      'text-max-width': 8,
      'symbol-sort-key': ['get', 'rank'],
    },
    paint: {
      'text-color': color,
      'text-halo-color': halo,
      'text-halo-width': 1.4,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0, 3, 0.6, 5, 1],
    },
  };
}

function townLabels(color: string, halo: string): StyleSpecification['layers'][0] {
  return {
    id: 'town-labels',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    filter: ['==', ['get', 'class'], 'town'],
    minzoom: 6,
    layout: {
      'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 9, 9, 12],
      'text-max-width': 6,
      'symbol-sort-key': ['get', 'rank'],
    },
    paint: {
      'text-color': color,
      'text-halo-color': halo,
      'text-halo-width': 1.2,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.7, 9, 1],
    },
  };
}

// ── Light / terrain style ─────────────────────────────────────────────────────
export const lightMapStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
    'terrain-dem': {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      encoding: 'terrarium',
      tileSize: 256,
      maxzoom: 14,
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': LAND_L } },

    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': WATER_L },
    },

    {
      id: 'hillshade',
      type: 'hillshade',
      source: 'terrain-dem',
      paint: {
        'hillshade-shadow-color': '#8B7050',
        'hillshade-highlight-color': '#FFFFFF',
        'hillshade-accent-color': '#886B50',
        'hillshade-illumination-direction': 335,
        'hillshade-exaggeration': 0.35,
      },
    },

    // Motorways + trunk roads
    {
      id: 'roads-highway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['match', ['get', 'class'], ['motorway', 'trunk'], true, false],
      minzoom: 4,
      paint: {
        'line-color': ROAD_HWY_L,
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 8, 2.5],
        'line-opacity': 0.85,
      },
    },

    // Primary roads
    {
      id: 'roads-primary',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['==', ['get', 'class'], 'primary'],
      minzoom: 5,
      paint: {
        'line-color': ROAD_PRI_L,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 8, 1.5],
        'line-opacity': 0.75,
      },
    },

    // State / province borders (dashed)
    {
      id: 'state-borders',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
      minzoom: 3,
      paint: {
        'line-color': BORDER_L,
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 7, 0.8],
        'line-dasharray': [3, 2],
        'line-opacity': 0.55,
      },
    },

    // Country borders
    {
      id: 'country-borders',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: {
        'line-color': BORDER_L,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 6, 1.2],
        'line-opacity': 0.9,
      },
    },

    // Country labels
    {
      id: 'country-labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', ['get', 'class'], 'country'],
      minzoom: 2,
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 14],
        'text-letter-spacing': 0.08,
        'text-transform': 'uppercase',
        'text-max-width': 8,
      },
      paint: {
        'text-color': LABEL_L,
        'text-halo-color': LAND_L,
        'text-halo-width': 1.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0, 3, 0.7, 6, 0.9],
      },
    },

    // State / province labels
    {
      id: 'state-labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', ['get', 'class'], 'state'],
      minzoom: 4,
      maxzoom: 8,
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 7, 12],
        'text-letter-spacing': 0.1,
        'text-transform': 'uppercase',
        'text-max-width': 6,
      },
      paint: {
        'text-color': STATE_L,
        'text-halo-color': LAND_L,
        'text-halo-width': 1.2,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 5, 0.6, 7, 0.8],
      },
    },

    // City labels
    cityLabels(CITY_L, LAND_L),

    // Town labels
    townLabels(CITY_L, LAND_L),
  ],
};

// ── Dark style ────────────────────────────────────────────────────────────────
export const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': LAND } },

    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': WATER },
    },

    {
      id: 'country-borders',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: {
        'line-color': BORDER,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.3, 6, 0.8],
        'line-opacity': 0.7,
      },
    },

    // Country labels
    {
      id: 'country-labels',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['==', ['get', 'class'], 'country'],
      minzoom: 2,
      layout: {
        'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 6, 13],
        'text-letter-spacing': 0.08,
        'text-transform': 'uppercase',
        'text-max-width': 8,
      },
      paint: {
        'text-color': LABEL,
        'text-halo-color': LAND,
        'text-halo-width': 1.2,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0, 3, 0.6, 6, 0.85],
      },
    },

    // City labels
    cityLabels(CITY, LAND),

    // Town labels
    townLabels(LABEL, LAND),
  ],
};
