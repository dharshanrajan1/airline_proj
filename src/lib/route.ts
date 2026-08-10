import type { Dataset, Route } from '../types';

// Matches route to airline; includes codeshares unless operatedOnly is true for live data.
export function routeMatchesAirline(r: Route, airline: string, operatedOnly: boolean): boolean {
  if (operatedOnly && r.source === 'live') return r.operator === airline;
  return r.airlines.includes(airline);
}

// Checks if airline operates any live flights.
export function airlineHasLiveData(data: Dataset, airline: string): boolean {
  for (const list of Object.values(data.routes)) {
    for (const r of list) {
      if (r.source === 'live' && r.operator === airline) return true;
    }
  }
  return false;
}
