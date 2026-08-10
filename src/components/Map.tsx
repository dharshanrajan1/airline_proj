import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { mapStyle, lightMapStyle } from '../map/style';
import { buildLayers } from '../map/layers';
import { useStore } from '../store';
import { useLoadData } from '../data/load';

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [zoom, setZoom] = useState(1.6);
  const prevTheme = useRef<'dark' | 'light'>('dark');

  useLoadData();

  const {
    data,
    selectedAirport,
    hoverAirport,
    selectedRoute,
    airlineFilter,
    operatedOnly,
    domesticOnly,
    internationalOnly,
    mapTheme,
    selectAirport,
    selectRoute,
    setHoverAirport,
    clearSelection,
  } = useStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [0, 25],
      zoom: 1.6,
      minZoom: 1.2,
      maxZoom: 8,
      attributionControl: false,
      renderWorldCopies: true,
    });

    const overlay = new MapboxOverlay({ interleaved: false, layers: [], pickingRadius: 8 });
    map.addControl(overlay as unknown as maplibregl.IControl);

    map.on('zoom', () => setZoom(map.getZoom()));

    map.on('click', (e) => {
      const picked = overlay.pickObject({ x: e.point.x, y: e.point.y, radius: 8 });
      if (!picked) useStore.getState().clearSelection();
    });

    mapRef.current = map;
    overlayRef.current = overlay;
    return () => {
      overlay.finalize();
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (prevTheme.current === mapTheme) return;
    prevTheme.current = mapTheme;
    mapRef.current?.setStyle(mapTheme === 'light' ? lightMapStyle : mapStyle);
  }, [mapTheme]);

  useEffect(() => {
    if (!overlayRef.current || !data) return;
    const layers = buildLayers({
      data,
      selectedAirport,
      hoverAirport,
      selectedRoute,
      airlineFilter,
      operatedOnly,
      domesticOnly,
      internationalOnly,
      zoom,
      theme: mapTheme,
      onClickAirport: (iata, isDestOfSelected) => {
        if (selectedAirport && isDestOfSelected) {
          selectRoute({ origin: selectedAirport, dest: iata });
        } else {
          selectAirport(iata);
        }
      },
      onHoverAirport: setHoverAirport,
      onClickArc: (origin, dest) => selectRoute({ origin, dest }),
    });
    overlayRef.current.setProps({ layers });
  }, [
    data,
    selectedAirport,
    hoverAirport,
    selectedRoute,
    airlineFilter,
    operatedOnly,
    domesticOnly,
    internationalOnly,
    zoom,
    mapTheme,
    selectAirport,
    selectRoute,
    setHoverAirport,
  ]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') clearSelection();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
