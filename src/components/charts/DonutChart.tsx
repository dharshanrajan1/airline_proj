import { useEffect, useState } from 'react';

type Segment = { label: string; value: number; color: string };

export default function DonutChart({ segments, size = 120 }: { segments: Segment[]; size?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    return () => setMounted(false);
  }, []);

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const r = (size - 16) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeWidth = 14;

  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0">
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;

          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              className="transition-all duration-700 ease-out"
              style={{
                opacity: mounted ? 1 : 0,
                transform: 'rotate(-90deg)',
                transformOrigin: `${cx}px ${cy}px`,
              }}
            />
          );
        })}
        {/* Center label */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="16" fontWeight="500">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
          routes
        </text>
      </svg>

      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-white/60">{seg.label}</span>
            <span className="ml-auto text-white/40 font-mono">
              {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
