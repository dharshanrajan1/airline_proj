import { useMemo } from 'react';
import type { Airport, Dataset, Route } from '../types';
import { haversine } from '../lib/geo';
import HBarChart from './charts/HBarChart';
import DonutChart from './charts/DonutChart';
import DistHistogram from './charts/DistHistogram';

type Props = {
  airport: Airport;
  routes: Route[];
  data: Dataset;
};

export default function AirportAnalytics({ airport, routes, data }: Props) {
  const stats = useMemo(() => {
    const airlineCounts: Record<string, number> = {};
    let domestic = 0;
    let international = 0;
    const distances: number[] = [];

    for (const r of routes) {
      const dest = data.airports[r.dest];
      if (!dest) continue;

      // Domestic vs international
      if (dest.country === airport.country) domestic++;
      else international++;

      // Airline counts
      for (const a of r.airlines) {
        airlineCounts[a] = (airlineCounts[a] || 0) + 1;
      }

      // Route distance
      distances.push(haversine(airport.lat, airport.lng, dest.lat, dest.lng));
    }

    const topAirlines = Object.entries(airlineCounts)
      .map(([iata, count]) => ({
        label: iata,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { topAirlines, domestic, international, distances };
  }, [airport, routes, data]);

  const avgDist = stats.distances.length > 0
    ? Math.round(stats.distances.reduce((s, d) => s + d, 0) / stats.distances.length)
    : 0;

  return (
    <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-1">
      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="Routes" value={routes.length} />
        <StatPill label="Airlines" value={stats.topAirlines.length} />
        <StatPill label="Avg dist" value={`${avgDist.toLocaleString()} km`} />
      </div>

      {/* Domestic vs International */}
      <Section title="Domestic vs. International">
        <DonutChart
          size={110}
          segments={[
            { label: 'Domestic', value: stats.domestic, color: '#6ee7b7' },
            { label: 'International', value: stats.international, color: '#f5a524' },
          ]}
        />
      </Section>

      {/* Top airlines */}
      {stats.topAirlines.length > 0 && (
        <Section title="Top Airlines">
          <HBarChart items={stats.topAirlines} maxItems={6} />
        </Section>
      )}

      {/* Distance distribution */}
      {stats.distances.length > 0 && (
        <Section title="Route Distances">
          <DistHistogram distances={stats.distances} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-white/30">{title}</div>
      {children}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2 text-center">
      <div className="text-sm font-medium text-white/80">{value}</div>
      <div className="text-[10px] text-white/30">{label}</div>
    </div>
  );
}
