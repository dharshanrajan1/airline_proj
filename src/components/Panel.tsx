import { useEffect, useState } from 'react';
import { useStore } from '../store';
import AirlineLogo from './AirlineLogo';
import { routeMatchesAirline } from '../lib/route';

export default function Panel() {
  const {
    data,
    selectedAirport,
    selectedRoute,
    airlineFilter,
    operatedOnly,
    domesticOnly,
    internationalOnly,
    mapTheme,
    selectAirport,
    selectRoute,
    clearSelection,
  } = useStore();

  if (!data || (!selectedAirport && !selectedRoute)) return null;

  if (selectedRoute) {
    const origin = data.airports[selectedRoute.origin];
    const dest = data.airports[selectedRoute.dest];
    const routes = data.routes[selectedRoute.origin] ?? [];
    const route = routes.find((r) => r.dest === selectedRoute.dest);
    if (!origin || !dest || !route) return null;

    return (
      <PanelShell
        mapTheme={mapTheme}
        onClose={() => selectRoute(null)}
        backLabel={`← ${origin.iata}`}
        onBack={() => selectRoute(null)}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-white/40">Route</div>
            <SourceBadge source={route.source} />
          </div>
          <div className="flex items-baseline gap-3 text-2xl font-medium">
            <span>{origin.iata}</span>
            <span className="text-white/30">→</span>
            <button
              onClick={() => selectAirport(dest.iata)}
              className="group inline-flex items-baseline gap-1 rounded-md px-1 -mx-1 transition hover:bg-white/5"
              title={`Explore flights from ${dest.iata}`}
            >
              {dest.iata}
              <span className="text-xs text-white/30 group-hover:text-white/70">↗</span>
            </button>
          </div>
          <div className="text-sm text-white/60">
            {origin.city} → {dest.city}
          </div>
        </div>

        {route.source === 'live' && route.operator ? (
          <>
            <div className="space-y-2 pt-2">
              <div className="text-xs uppercase tracking-widest text-white/40">Operator</div>
              <ul>
                <CarrierRow iata={route.operator} name={data.airlines[route.operator]?.name} />
              </ul>
            </div>
            {route.codeshares && route.codeshares.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs uppercase tracking-widest text-white/40">
                  Codeshares ({route.codeshares.length})
                </div>
                <ul className="space-y-1">
                  {route.codeshares.map((iata) => (
                    <CarrierRow key={iata} iata={iata} name={data.airlines[iata]?.name} />
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 pt-2">
            <div className="text-xs uppercase tracking-widest text-white/40">
              Carriers ({route.airlines.length})
            </div>
            <ul className="space-y-1">
              {route.airlines.map((iata) => (
                <CarrierRow key={iata} iata={iata} name={data.airlines[iata]?.name} />
              ))}
            </ul>
            <p className="pt-2 text-[11px] leading-snug text-white/30">
              Source: OpenFlights — list may mix operating airline with codeshare partners.
            </p>
          </div>
        )}
      </PanelShell>
    );
  }

  // Airport view
  const airport = data.airports[selectedAirport!];
  const routes = data.routes[selectedAirport!] ?? [];
  if (!airport) return null;

  const filtered = routes.filter((r) => {
    if (airlineFilter && !routeMatchesAirline(r, airlineFilter, operatedOnly)) return false;
    const d = data.airports[r.dest];
    if (!d) return false;
    const sameCountry = d.country === airport.country;
    if (domesticOnly && !sameCountry) return false;
    if (internationalOnly && sameCountry) return false;
    return true;
  });

  return (
    <PanelShell mapTheme={mapTheme} onClose={clearSelection}>
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-white/40">Airport</div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-medium">{airport.iata}</span>
          <span className="text-sm text-white/40">{airport.country}</span>
        </div>
        <div className="text-sm text-white/70 truncate" title={airport.name}>{airport.name}</div>
        <div className="text-xs text-white/40">{airport.city}</div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xs uppercase tracking-widest text-white/40">
            Destinations{airlineFilter ? ` via ${airlineFilter}` : ''} ({filtered.length})
          </div>
          {airlineFilter && filtered.length < routes.length && (
            <div className="text-[10px] text-white/30">
              {routes.length} total
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-white/30">No routes match these filters</div>
        ) : (
          <div className="relative">
            <ul className="max-h-[55vh] space-y-0.5 overflow-y-auto pr-1">
              {filtered.map((r) => {
                const d = data.airports[r.dest];
                if (!d) return null;
                return (
                  <li key={r.dest} className="group relative flex items-stretch">
                    <button
                      className="flex flex-1 items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-white/5"
                      onClick={() => selectRoute({ origin: airport.iata, dest: r.dest })}
                      title={`View ${airport.iata} → ${r.dest} route`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-white/90">{r.dest}</span>
                        <span className="text-white/50 truncate" title={d.city}>{d.city}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-white/30 shrink-0">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.source === 'live' ? 'bg-emerald-400/60' : 'bg-white/20'
                          }`}
                        />
                        {r.airlines.length}
                      </span>
                    </button>
                    <button
                      onClick={() => selectAirport(r.dest)}
                      className="invisible flex w-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white group-hover:visible"
                      aria-label={`Explore from ${r.dest}`}
                      title={`Explore from ${r.dest}`}
                    >
                      ↗
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
        )}
      </div>
    </PanelShell>
  );
}

function SourceBadge({ source }: { source: 'live' | 'openflights' }) {
  if (source === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300/90">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Live schedule
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/40">
      OpenFlights
    </span>
  );
}

function CarrierRow({ iata, name }: { iata: string; name?: string }) {
  const airline = useStore.getState().data?.airlines[iata];
  return (
    <li className="flex items-center gap-3 text-sm">
      <AirlineLogo airline={airline} iata={iata} />
      <span className="truncate text-white/80">{name ?? 'Unknown airline'}</span>
    </li>
  );
}

function PanelShell({
  children,
  onClose,
  onBack,
  backLabel,
  mapTheme,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  mapTheme: 'dark' | 'light';
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const bg = mapTheme === 'light' ? 'bg-black/65' : 'bg-white/5';

  return (
    <div
      className={`pointer-events-auto absolute right-4 top-4 bottom-4 w-[340px] overflow-hidden rounded-2xl border border-white/10 ${bg} shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'
      }`}
    >
      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between pb-3">
          {onBack ? (
            <button onClick={onBack} className="text-xs text-white/50 transition hover:text-white">
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
