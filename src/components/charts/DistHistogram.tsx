import { useEffect, useState } from 'react';

const BINS = [
  { label: '<500', min: 0, max: 500 },
  { label: '500-1.5k', min: 500, max: 1500 },
  { label: '1.5-4k', min: 1500, max: 4000 },
  { label: '4-8k', min: 4000, max: 8000 },
  { label: '8k+', min: 8000, max: Infinity },
] as const;

const BAR_COLORS = ['#6ee7b7', '#34d399', '#f5a524', '#fb923c', '#f87171'];

export default function DistHistogram({ distances }: { distances: number[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);

  const counts = BINS.map((b) => distances.filter((d) => d >= b.min && d < b.max).length);
  const peak = Math.max(...counts, 1);

  const w = 36, gap = 6;
  const totalW = BINS.length * (w + gap) - gap;
  const h = 80;

  return (
    <div className="space-y-1">
      <svg width="100%" viewBox={`0 0 ${totalW} ${h + 18}`} className="overflow-visible">
        {counts.map((n, i) => {
          const bh = (n / peak) * h;
          const x = i * (w + gap);
          return (
            <g key={i}>
              <rect
                x={x} y={ready ? h - bh : h}
                width={w} height={ready ? bh : 0}
                rx={3} fill={BAR_COLORS[i]} opacity={0.8}
                className="transition-all duration-500 ease-out"
                style={{ transitionDelay: `${i * 60}ms` }}
              />
              {n > 0 && (
                <text
                  x={x + w / 2} y={h - bh - 4}
                  textAnchor="middle" fill="rgba(255,255,255,0.5)"
                  fontSize="9" fontFamily="monospace"
                  className="transition-opacity duration-300"
                  style={{ opacity: ready ? 1 : 0, transitionDelay: `${i * 60 + 200}ms` }}
                >{n}</text>
              )}
              <text
                x={x + w / 2} y={h + 13}
                textAnchor="middle" fill="rgba(255,255,255,0.35)"
                fontSize="8" fontFamily="monospace"
              >{BINS[i].label}</text>
            </g>
          );
        })}
      </svg>
      <div className="text-center text-[10px] text-white/25">distance (km)</div>
    </div>
  );
}
