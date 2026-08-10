import { useEffect, useState } from 'react';

type Item = { label: string; value: number; color?: string };

export default function HBarChart({ items, maxItems = 6 }: { items: Item[]; maxItems?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    return () => setMounted(false);
  }, []);

  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, maxItems);
  const max = sorted[0]?.value ?? 1;

  return (
    <div className="space-y-1.5">
      {sorted.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-10 shrink-0 truncate text-right text-white/50 font-mono" title={item.label}>
            {item.label}
          </span>
          <div className="relative h-4 flex-1 overflow-hidden rounded bg-white/5">
            <div
              className="absolute inset-y-0 left-0 rounded transition-all duration-500 ease-out"
              style={{
                width: mounted ? `${(item.value / max) * 100}%` : '0%',
                backgroundColor: item.color ?? '#f5a524',
              }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-white/40 font-mono">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
