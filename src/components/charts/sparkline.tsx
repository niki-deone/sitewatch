// src/components/charts/sparkline.tsx
import type { MonitorStatus } from "@/db/schema";

const strokeFor: Record<MonitorStatus, string> = {
  up: "var(--pen)",
  degraded: "var(--degraded)",
  down: "var(--down)",
  pending: "var(--pending)",
};

export function Sparkline({ values, status, width = 120, height = 32 }: { values: number[]; status: MonitorStatus; width?: number; height?: number }) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden>
        <line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="var(--line-strong)" strokeDasharray="3 4" />
      </svg>
    );
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(max - min, 1);
  const pad = 3;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = pad + (1 - (value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const gradientId = `spark-${status}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={strokeFor[status]} stopOpacity="0.18" />
          <stop offset="100%" stopColor={strokeFor[status]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={strokeFor[status]} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" className="draw-in" style={{ ["--dash" as string]: 400 }} />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={strokeFor[status]} />
    </svg>
  );
}
