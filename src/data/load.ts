import { useEffect } from 'react';
import { useStore } from '../store';
import type { Dataset } from '../types';

export function useLoadData() {
  const setData = useStore((s) => s.setData);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [airports, airlines, routes, airlineHubs] = await Promise.all([
        fetch('/data/airports.json').then((r) => r.json()),
        fetch('/data/airlines.json').then((r) => r.json()),
        fetch('/data/routes.json').then((r) => r.json()),
        fetch('/data/airlineHubs.json').then((r) => r.json()),
      ]);
      if (cancelled) return;
      setData({ airports, airlines, routes, airlineHubs } as Dataset);
    })();
    return () => {
      cancelled = true;
    };
  }, [setData]);
}
