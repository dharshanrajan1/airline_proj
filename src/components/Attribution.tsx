import { useStore } from '../store';

export default function Attribution() {
  const { mapTheme } = useStore();
  const cls = mapTheme === 'light'
    ? 'text-black/40 [&>a]:hover:text-black/70'
    : 'text-white/30 [&>a]:hover:text-white/60';

  return (
    <div className={`pointer-events-auto absolute bottom-2 right-3 text-[10px] ${cls}`}>
      <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>
      {' · '}
      <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a>
      {' · '}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
      {' · '}
      <a href="https://openflights.org/data" target="_blank" rel="noreferrer">OpenFlights routes</a>
    </div>
  );
}
