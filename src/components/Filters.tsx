import { useMemo, useState, useRef } from 'react';
import { useStore } from '../store';
import AirlineLogo from './AirlineLogo';

export default function Filters() {
  const {
    data,
    airlineFilter,
    operatedOnly,
    domesticOnly,
    internationalOnly,
    mapTheme,
    setAirlineFilter,
    setOperatedOnly,
    setDomesticOnly,
    setInternationalOnly,
    setMapTheme,
    selectAirport,
  } = useStore();

  const [airportQuery, setAirportQuery] = useState('');
  const [airlineQuery, setAirlineQuery] = useState('');
  const [airportOpen, setAirportOpen] = useState(false);
  const [airlineOpen, setAirlineOpen] = useState(false);
  const [airportFocusIdx, setAirportFocusIdx] = useState(-1);
  const [airlineFocusIdx, setAirlineFocusIdx] = useState(-1);
  const airportListRef = useRef<HTMLUListElement>(null);
  const airlineListRef = useRef<HTMLUListElement>(null);

  const airportResults = useMemo(() => {
    if (!data) return [];
    const q = airportQuery.trim().toLowerCase();
    if (q.length < 1) return [];
    const out = [];
    for (const a of Object.values(data.airports)) {
      if (
        a.iata.toLowerCase().startsWith(q) ||
        a.city.toLowerCase().startsWith(q) ||
        a.name.toLowerCase().includes(q)
      ) {
        out.push(a);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [data, airportQuery]);

  const airlineResults = useMemo(() => {
    if (!data) return [];
    const q = airlineQuery.trim().toLowerCase();
    const all = Object.values(data.airlines);
    if (q.length < 1) return all.slice(0, 8);
    const out = [];
    for (const a of all) {
      if (a.iata.toLowerCase().startsWith(q) || a.name.toLowerCase().includes(q)) {
        out.push(a);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [data, airlineQuery]);

  if (!data) return null;

  const activeAirline = airlineFilter ? data.airlines[airlineFilter] : null;
  const panelBg = mapTheme === 'light' ? 'bg-black/65' : 'bg-white/5';

  function handleAirportKeyDown(e: React.KeyboardEvent) {
    if (!airportOpen || airportResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAirportFocusIdx((i) => {
        const next = Math.min(i + 1, airportResults.length - 1);
        airportListRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAirportFocusIdx((i) => {
        const next = Math.max(i - 1, 0);
        airportListRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' && airportFocusIdx >= 0) {
      e.preventDefault();
      const a = airportResults[airportFocusIdx];
      selectAirport(a.iata);
      setAirportQuery('');
      setAirportOpen(false);
      setAirportFocusIdx(-1);
    } else if (e.key === 'Escape') {
      setAirportOpen(false);
      setAirportFocusIdx(-1);
    }
  }

  function handleAirlineKeyDown(e: React.KeyboardEvent) {
    if (!airlineOpen || airlineResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAirlineFocusIdx((i) => {
        const next = Math.min(i + 1, airlineResults.length - 1);
        airlineListRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAirlineFocusIdx((i) => {
        const next = Math.max(i - 1, 0);
        airlineListRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' && airlineFocusIdx >= 0) {
      e.preventDefault();
      const a = airlineResults[airlineFocusIdx];
      setAirlineFilter(a.iata);
      setAirlineQuery('');
      setAirlineOpen(false);
      setAirlineFocusIdx(-1);
    } else if (e.key === 'Escape') {
      setAirlineOpen(false);
      setAirlineFocusIdx(-1);
    }
  }

  return (
    <div className="pointer-events-auto absolute left-4 top-4 flex flex-col gap-2">
      <div className={`flex items-center gap-2 rounded-2xl border border-white/10 ${panelBg} p-1.5 shadow-2xl backdrop-blur-xl`}>
        <div className="relative">
          <input
            value={airportQuery}
            onChange={(e) => { setAirportQuery(e.target.value); setAirportFocusIdx(-1); }}
            onFocus={() => setAirportOpen(true)}
            onBlur={() => { setAirportOpen(false); setAirportFocusIdx(-1); }}
            onKeyDown={handleAirportKeyDown}
            placeholder="Search airport"
            className="w-48 rounded-xl bg-transparent px-3 py-1.5 text-sm placeholder:text-white/30 focus:outline-none"
          />
          {airportQuery.length > 0 && (
            <button
              onMouseDown={() => setAirportQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              aria-label="Clear airport search"
            >
              ×
            </button>
          )}
          {airportOpen && airportResults.length > 0 && (
            <ul
              ref={airportListRef}
              className="absolute left-0 top-full z-10 mt-2 w-72 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl"
            >
              {airportResults.map((a, idx) => (
                <li key={a.iata}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectAirport(a.iata);
                      setAirportQuery('');
                      setAirportOpen(false);
                      setAirportFocusIdx(-1);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                      idx === airportFocusIdx ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="font-mono text-white/90">{a.iata}</span>
                    <span className="truncate text-white/60">{a.city}</span>
                    <span className="ml-auto truncate text-xs text-white/30">{a.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-5 w-px bg-white/10" />

        <div className="relative flex items-center">
          {activeAirline && !airlineOpen && (
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
              <AirlineLogo airline={activeAirline} />
            </span>
          )}
          <input
            value={airlineOpen ? airlineQuery : activeAirline ? activeAirline.name : ''}
            onChange={(e) => { setAirlineQuery(e.target.value); setAirlineFocusIdx(-1); }}
            onFocus={() => {
              setAirlineOpen(true);
              setAirlineQuery('');
            }}
            onBlur={() => { setAirlineOpen(false); setAirlineFocusIdx(-1); }}
            onKeyDown={handleAirlineKeyDown}
            placeholder="Filter by airline"
            className={`w-56 rounded-xl bg-transparent py-1.5 text-sm placeholder:text-white/30 focus:outline-none ${
              activeAirline && !airlineOpen ? 'pl-12 pr-7' : 'px-3'
            }`}
          />
          {activeAirline && !airlineOpen && (
            <button
              onMouseDown={() => setAirlineFilter(null)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              aria-label="Clear airline"
            >
              ×
            </button>
          )}
          {airlineOpen && airlineResults.length > 0 && (
            <ul
              ref={airlineListRef}
              className="absolute left-0 top-full z-10 mt-2 w-80 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl"
            >
              {airlineResults.map((a, idx) => (
                <li key={a.iata}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setAirlineFilter(a.iata);
                      setAirlineQuery('');
                      setAirlineOpen(false);
                      setAirlineFocusIdx(-1);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                      idx === airlineFocusIdx ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <AirlineLogo airline={a} />
                    <span className="truncate text-white/80">{a.name}</span>
                    <span className="ml-auto truncate text-xs text-white/30">{a.country}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {airlineFilter && (
          <>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-1 rounded-xl bg-white/5 p-0.5">
              <ToggleBtn active={!operatedOnly} onClick={() => setOperatedOnly(false)}>All</ToggleBtn>
              <ToggleBtn active={operatedOnly} onClick={() => setOperatedOnly(true)}>Operated</ToggleBtn>
            </div>
          </>
        )}

        <div className="h-5 w-px bg-white/10" />

        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-0.5">
          <ToggleBtn active={!domesticOnly && !internationalOnly} onClick={() => { setDomesticOnly(false); setInternationalOnly(false); }}>All</ToggleBtn>
          <ToggleBtn active={domesticOnly} onClick={() => setDomesticOnly(!domesticOnly)}>Dom</ToggleBtn>
          <ToggleBtn active={internationalOnly} onClick={() => setInternationalOnly(!internationalOnly)}>Intl</ToggleBtn>
        </div>

        <div className="h-5 w-px bg-white/10" />

        <button
          onClick={() => setMapTheme(mapTheme === 'dark' ? 'light' : 'dark')}
          className="rounded-xl px-2.5 py-1 text-xs text-white/50 transition hover:bg-white/10 hover:text-white/90"
          title={mapTheme === 'dark' ? 'Switch to terrain map' : 'Switch to dark map'}
        >
          {mapTheme === 'dark' ? 'Terrain' : 'Dark'}
        </button>
      </div>
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs transition ${
        active ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
      }`}
    >
      {children}
    </button>
  );
}
