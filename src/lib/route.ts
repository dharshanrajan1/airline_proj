import type { Dataset, Route } from '../types';

// Whether a route is served by the given airline — either as operator OR codeshare partner.
// This reflects "where the airline flies" from a passenger's POV (UA codeshares on TP's
// US→Lisbon flights, so UA "serves" LIS even though it doesn't operate the metal).
//
// For 'live' routes (AeroDataBox-derived), the airlines list is precise: operator + actual
// codeshares observed in scheduled flights. For 'openflights' (legacy), the list is the
// union of every carrier ever tagged on the segment — looser, but it's all we have for the
// non-crawled long tail.
//
// We accept some inflation in OpenFlights for airlines that have live data, in exchange for
// catching real codeshare destinations (like UA→LIS) that the live crawl missed due to the
// 12-hour window.
// operatedOnly=true: for live routes, require the airline to be the operator (not just a
// codeshare partner). OpenFlights routes have no operator/codeshare distinction, so they
// fall back to the loose match — better to show them than silently drop coverage.
export function routeMatchesAirline(r: Route, airline: string, operatedOnly: boolean): boolean {
  if (operatedOnly && r.source === 'live') return r.operator === airline;
  return r.airlines.includes(airline);
}

// Does this airline appear as the operator on any 'live' route? Kept for hub computation
// and any future UI that wants to surface "where the airline actually flies its own metal".
export function airlineHasLiveData(data: Dataset, airline: string): boolean {
  for (const list of Object.values(data.routes)) {
    for (const r of list) {
      if (r.source === 'live' && r.operator === airline) return true;
    }
  }
  return false;
}
