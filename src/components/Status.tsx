import { useStore } from '../store';

export default function Status() {
  const { data, selectedAirport, selectedRoute, airlineFilter } = useStore();

  if (!data) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-white/60 backdrop-blur-xl">
          Loading routes…
        </div>
      </div>
    );
  }

  if (selectedAirport || selectedRoute) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
      <div className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs text-white/60 backdrop-blur-xl">
        {airlineFilter
          ? 'Click any highlighted airport to see routes'
          : 'Click an airport, or search to begin'}
      </div>
    </div>
  );
}
