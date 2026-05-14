import { useState } from 'react';
import type { Airline } from '../types';

type Props = {
  airline: Pick<Airline, 'iata' | 'logoUrl'> | undefined;
  iata?: string;
  size?: 'sm' | 'md';
};

export default function AirlineLogo({ airline, iata, size = 'sm' }: Props) {
  const code = airline?.iata ?? iata ?? '?';
  const url = airline?.logoUrl;
  const [errored, setErrored] = useState(false);

  const box =
    size === 'md'
      ? 'h-8 w-12 text-xs'
      : 'h-6 w-9 text-[11px]';

  if (!url || errored) {
    return (
      <span
        className={`${box} inline-flex shrink-0 items-center justify-center rounded bg-white/5 font-mono text-white/80`}
      >
        {code}
      </span>
    );
  }

  return (
    <span className={`${box} inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-white p-0.5`}>
      <img
        src={url}
        alt={code}
        className="max-h-full max-w-full object-contain"
        onError={() => setErrored(true)}
        loading="lazy"
      />
    </span>
  );
}
