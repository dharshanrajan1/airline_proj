export type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  routeCount: number;
};

export type Airline = {
  iata: string;
  name: string;
  country: string;
  logoUrl?: string;
};

export type Route = {
  dest: string;
  airlines: string[];
  operator?: string | null;
  codeshares?: string[];
  source: 'live' | 'openflights';
};

export type Dataset = {
  airports: Record<string, Airport>;
  airlines: Record<string, Airline>;
  routes: Record<string, Route[]>;
  airlineHubs: Record<string, string[]>;
};
