import { useEffect, useState } from 'react';

const BUCKETS = [
  { label: '<500', min: 0, max: 500 },
  { label: '500-1.5k', min: 500, max: 1500 },
  { label: '1.5-4k', min: 1500, max: 4000 },
  { label: '4-8k', min: 4000, max: 8000 },
  { label: '8k+', min: 8000, max: Infinity },
] as const;

const COLORS = ['#6ee7b7', '#34d399', '#f5a524', '#fb923c', '#f87171'];

export default function DistHistogram({ distances }: { distances: number[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    return () => setMounted(false);
  }, []);

  const counts = BUCKETS.map((b) => distances.filter((d) => d >= b.min && d < b.max).length);
  const max = Math.max(...counts, 1);
  const barWidth = 36;
  const gap = 6;
  const svgWidth = BUCKETS.length * (barWidth + gap) - gap;
  const svgHeight = 80;
  const labelHeight = 18;

  return (
    <div className="space-y-1">
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight + labelHeight}`} className="overflow-visible">
        {counts.map((count, i) => {
          const barHeight = (count / max) * svgHeight;
          const x = i * (barWidth + gap);
          const y = svgHeight - barHeight;

          return (
            <g key={BUCKETS[i].label}>
              {/* Bar */}
              <rect
                x={x}
                y={mounted ? y : svgHeight}
                width={barWidth}
                height={mounted ? barHeight : 0}
                rx={3}
                fill={COLORS[i]}
                opacity={0.8}
                className="transition-all duration-500 ease-out"
                style={{ transitionDelay: `${i * 60}ms` }}
              />
              {/* Count */}
              {count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.5)"
                  fontSize="9"
                  fontFamily="monospace"
                  className="transition-opacity duration-300"
                  style={{ opacity: mounted ? 1 : 0, transitionDelay: `${i * 60 + 200}ms` }}
                >
                  {count}
                </text>
              )}
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={svgHeight + 13}
                textAnchor="middle"
                fill="rgba(255,255,255,0.35)"
                fontSize="8"
                fontFamily="monospace"
              >
                {BUCKETS[i].label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-center text-[10px] text-white/25">distance (km)</div>
    </div>
  );
}
