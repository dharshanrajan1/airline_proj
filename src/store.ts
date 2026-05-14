import { create } from 'zustand';
import type { Dataset } from './types';

type SelectedRoute = { origin: string; dest: string };

type State = {
  data: Dataset | null;
  selectedAirport: string | null;
  selectedRoute: SelectedRoute | null;
  airlineFilter: string | null;
  operatedOnly: boolean;
  domesticOnly: boolean;
  internationalOnly: boolean;
  hoverAirport: string | null;
  mapTheme: 'dark' | 'light';
  setData: (d: Dataset) => void;
  selectAirport: (iata: string | null) => void;
  selectRoute: (r: SelectedRoute | null) => void;
  setAirlineFilter: (a: string | null) => void;
  setOperatedOnly: (v: boolean) => void;
  setDomesticOnly: (v: boolean) => void;
  setInternationalOnly: (v: boolean) => void;
  setHoverAirport: (iata: string | null) => void;
  setMapTheme: (t: 'dark' | 'light') => void;
  clearSelection: () => void;
};

export const useStore = create<State>((set) => ({
  data: null,
  selectedAirport: null,
  selectedRoute: null,
  airlineFilter: null,
  operatedOnly: false,
  domesticOnly: false,
  internationalOnly: false,
  hoverAirport: null,
  mapTheme: 'dark',
  setData: (d) => set({ data: d }),
  selectAirport: (iata) => set({ selectedAirport: iata, selectedRoute: null }),
  selectRoute: (r) => set({ selectedRoute: r }),
  setAirlineFilter: (a) => set({ airlineFilter: a, operatedOnly: false }),
  setOperatedOnly: (v) => set({ operatedOnly: v }),
  setDomesticOnly: (v) => set((s) => ({ domesticOnly: v, internationalOnly: v ? false : s.internationalOnly })),
  setInternationalOnly: (v) => set((s) => ({ internationalOnly: v, domesticOnly: v ? false : s.domesticOnly })),
  setHoverAirport: (iata) => set({ hoverAirport: iata }),
  setMapTheme: (t) => set({ mapTheme: t }),
  clearSelection: () => set({ selectedAirport: null, selectedRoute: null }),
}));
