import { useEffect, useState } from 'react';

type Seg = { label: string; value: number; color: string };

export default function DonutChart({ segments, size = 120 }: { segments: Seg[]; size?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setShow(true)); }, []);

  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;

  const r = (size - 16) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let off = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={14} />
        {segments.map((seg) => {
          const arc = (seg.value / total) * circ;
          const cur = off;
          off += arc;
          return (
            <circle
              key={seg.label}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${arc} ${circ - arc}`}
              strokeDashoffset={-cur}
              strokeLinecap="butt"
              className="transition-all duration-700 ease-out"
              style={{
                opacity: show ? 1 : 0,
                transform: 'rotate(-90deg)',
                transformOrigin: `${c}px ${c}px`,
              }}
            />
          );
        })}
        <text x={c} y={c - 4} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16" fontWeight="500">
          {total}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
          routes
        </text>
      </svg>

      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-white/60">{seg.label}</span>
            <span className="ml-auto text-white/40 font-mono">
              {Math.round((seg.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
