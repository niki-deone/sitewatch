// src/components/charts/latency-chart.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LatencyPoint } from "@/lib/queries";
import { formatMs } from "@/lib/format";

const HEIGHT = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 48 };

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

function formatTick(iso: string, range: string): string {
  const date = new Date(iso);
  if (range === "24h") return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function LatencyChart({ points, range }: { points: LatencyPoint[]; range: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const chart = useMemo(() => {
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const values = points.map((point) => point.avg ?? 0);
    const yMax = niceMax(Math.max(...values, 1) * 1.1);
    const x = (index: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const y = (value: number) => PAD.top + innerH - (value / yMax) * innerH;

    let line = "";
    let started = false;
    points.forEach((point, index) => {
      if (point.avg === null) {
        started = false;
        return;
      }
      line += `${started ? "L" : "M"}${x(index).toFixed(1)},${y(point.avg).toFixed(1)} `;
      started = true;
    });
    const firstIndex = points.findIndex((point) => point.avg !== null);
    const lastIndex = points.length - 1 - [...points].reverse().findIndex((point) => point.avg !== null);
    const area =
      firstIndex >= 0 && line
        ? `${line} L${x(lastIndex).toFixed(1)},${PAD.top + innerH} L${x(firstIndex).toFixed(1)},${PAD.top + innerH} Z`
        : "";

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({ value: Math.round(yMax * fraction), y: y(yMax * fraction) }));
    const tickCount = Math.min(6, points.length);
    const xTicks = Array.from({ length: tickCount }, (_, i) => {
      const index = Math.round((i / Math.max(tickCount - 1, 1)) * (points.length - 1));
      return { index, x: x(index), label: points[index] ? formatTick(points[index].t, range) : "" };
    });

    return { innerW, innerH, x, y, line, area, yTicks, xTicks };
  }, [points, width, range]);

  if (points.length === 0) {
    return (
      <div ref={containerRef} className="graph-paper grid h-[240px] place-items-center rounded-lg border border-dashed border-line-strong text-sm text-ink-3">
        No checks in this period yet.
      </div>
    );
  }

  const hovered = hover !== null ? points[hover] : null;

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relative = ((event.clientX - rect.left) / rect.width) * width - PAD.left;
    const index = Math.round((relative / chart.innerW) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label="Response time chart"
        className="touch-none select-none"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="latency-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--pen)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--pen)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {chart.yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={PAD.left} x2={width - PAD.right} y1={tick.y} y2={tick.y} stroke="var(--line)" strokeDasharray={tick.value === 0 ? undefined : "2 4"} />
            <text x={PAD.left - 8} y={tick.y + 4} textAnchor="end" className="fill-ink-3 font-mono text-[10px]">
              {tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}s` : `${tick.value}`}
            </text>
          </g>
        ))}

        {chart.xTicks.map((tick) => (
          <text
            key={tick.index}
            x={tick.x}
            y={HEIGHT - 8}
            textAnchor={tick.index === 0 ? "start" : tick.index === points.length - 1 ? "end" : "middle"}
            className="fill-ink-3 font-mono text-[10px]"
          >
            {tick.label}
          </text>
        ))}

        {/* Failed buckets: red marks along the baseline, like a recorder pen hitting the stop. */}
        {points.map((point, index) =>
          point.worst === "down" ? (
            <rect key={point.t} x={chart.x(index) - 2} y={PAD.top} width={4} height={chart.innerH} fill="var(--down)" opacity={0.12} rx={2} />
          ) : null,
        )}

        {chart.area ? <path d={chart.area} fill="url(#latency-fill)" /> : null}
        <path
          key={`${range}-${points.length}`}
          d={chart.line}
          fill="none"
          stroke="var(--pen)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="draw-in"
          style={{ ["--dash" as string]: 4000 }}
        />

        {points.map((point, index) =>
          point.worst === "down" ? <circle key={`d-${point.t}`} cx={chart.x(index)} cy={PAD.top + chart.innerH} r={3} fill="var(--down)" /> : null,
        )}

        {hovered && hover !== null ? (
          <g>
            <line x1={chart.x(hover)} x2={chart.x(hover)} y1={PAD.top} y2={PAD.top + chart.innerH} stroke="var(--ink-3)" strokeDasharray="3 3" />
            {hovered.avg !== null ? (
              <circle cx={chart.x(hover)} cy={chart.y(hovered.avg)} r={4.5} fill="var(--surface)" stroke="var(--pen)" strokeWidth={2} />
            ) : null}
          </g>
        ) : null}
      </svg>

      {hovered && hover !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md border border-line bg-surface px-3 py-2 text-[12px] shadow-pop"
          style={{
            left: `${(chart.x(hover) / width) * 100}%`,
            transform: chart.x(hover) > width * 0.65 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <div className="font-medium">
            {new Date(hovered.t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="mt-1 grid grid-cols-[auto_auto] gap-x-3 font-mono text-ink-2 tabular">
            <span className="text-ink-3">avg</span>
            <span>{formatMs(hovered.avg)}</span>
            <span className="text-ink-3">max</span>
            <span>{formatMs(hovered.max)}</span>
            <span className="text-ink-3">checks</span>
            <span>{hovered.total}</span>
          </div>
          {hovered.worst !== "up" ? (
            <div className={hovered.worst === "down" ? "mt-1 text-down" : "mt-1 text-degraded"}>
              {hovered.worst === "down" ? "Failures in this window" : "Slow responses"}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
