import { useMemo } from 'react';
import type { Airport, Dataset, Route } from '../types';
import { haversine } from '../lib/geo';
import HBarChart from './charts/HBarChart';
import DonutChart from './charts/DonutChart';
import DistHistogram from './charts/DistHistogram';

export default function AirportAnalytics({
  airport, routes, data,
}: {
  airport: Airport; routes: Route[]; data: Dataset;
}) {
  const { topAirlines, domestic, intl, distances } = useMemo(() => {
    const counts: Record<string, number> = {};
    let dom = 0, intl = 0;
    const dists: number[] = [];

    for (const r of routes) {
      const dest = data.airports[r.dest];
      if (!dest) continue;
      if (dest.country === airport.country) dom++; else intl++;
      for (const a of r.airlines) counts[a] = (counts[a] || 0) + 1;
      dists.push(haversine(airport.lat, airport.lng, dest.lat, dest.lng));
    }

    const top = Object.entries(counts)
      .map(([iata, n]) => ({ label: iata, value: n }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { topAirlines: top, domestic: dom, intl, distances: dists };
  }, [airport, routes, data]);

  const avgKm = distances.length
    ? Math.round(distances.reduce((s, d) => s + d, 0) / distances.length)
    : 0;

  return (
    <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-1">
      <div className="grid grid-cols-3 gap-2">
        <Pill label="Routes" value={routes.length} />
        <Pill label="Airlines" value={topAirlines.length} />
        <Pill label="Avg dist" value={`${avgKm.toLocaleString()} km`} />
      </div>

      <ChartSection title="Domestic vs. International">
        <DonutChart
          size={110}
          segments={[
            { label: 'Domestic', value: domestic, color: '#6ee7b7' },
            { label: 'International', value: intl, color: '#f5a524' },
          ]}
        />
      </ChartSection>

      {topAirlines.length > 0 && (
        <ChartSection title="Top Airlines">
          <HBarChart items={topAirlines} maxItems={6} />
        </ChartSection>
      )}

      {distances.length > 0 && (
        <ChartSection title="Route Distances">
          <DistHistogram distances={distances} />
        </ChartSection>
      )}
    </div>
  );
}

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-white/30">{title}</div>
      {children}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2 text-center">
      <div className="text-sm font-medium text-white/80">{value}</div>
      <div className="text-[10px] text-white/30">{label}</div>
    </div>
  );
}
