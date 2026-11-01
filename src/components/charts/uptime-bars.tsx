// src/components/charts/uptime-bars.tsx
"use client";

import { useId, useState } from "react";
import { cx } from "@/lib/cx";
import { formatDay, formatPercent } from "@/lib/format";

export type Bar = { day: string; total: number; ok: number; degraded: number };

function barTone(bar: Bar): string {
  if (bar.total === 0) return "bg-line";
  const ratio = bar.ok / bar.total;
  if (ratio < 0.97) return "bg-down";
  if (ratio < 1) return "bg-degraded";
  if (bar.degraded / bar.total > 0.2) return "bg-degraded";
  return "bg-up";
}

function describe(bar: Bar): string {
  if (bar.total === 0) return "No data";
  const pct = (bar.ok / bar.total) * 100;
  const failed = bar.total - bar.ok;
  return `${formatPercent(pct)} uptime${failed ? `, ${failed} failed check${failed === 1 ? "" : "s"}` : ""}`;
}

export function UptimeBars({
  days,
  height = 32,
  showLegend = false,
  animate = true,
  className,
}: {
  days: Bar[];
  height?: number;
  showLegend?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();
  const withData = days.filter((bar) => bar.total > 0);
  const overall = withData.length
    ? (withData.reduce((sum, bar) => sum + bar.ok, 0) / withData.reduce((sum, bar) => sum + bar.total, 0)) * 100
    : null;
  const current = active !== null ? days[active] : null;

  return (
    <div className={cx("relative", className)}>
      <div
        role="img"
        aria-label={`Daily uptime for the last ${days.length} days, ${formatPercent(overall)} overall`}
        className="flex items-end gap-[2px]"
        style={{ height }}
        onMouseLeave={() => setActive(null)}
      >
        {days.map((bar, index) => (
          // Spans, not buttons: the bars are often rendered inside a link row, and interactive elements can't nest.
          <span
            key={bar.day}
            aria-describedby={active === index ? tooltipId : undefined}
            onPointerEnter={() => setActive(index)}
            onPointerDown={() => setActive(index)}
            className={cx(
              "h-full min-w-[3px] flex-1 rounded-[2px] transition-[opacity,transform] duration-150 hover:scale-y-[1.08]",
              barTone(bar),
              active !== null && active !== index && "opacity-50",
              animate && "bar-grow",
            )}
            style={animate ? { animationDelay: `${Math.min(index * 8, 600)}ms` } : undefined}
          >
            <span className="sr-only">
              {formatDay(bar.day)}: {describe(bar)}
            </span>
          </span>
        ))}
      </div>

      {current ? (
        <div
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] shadow-pop"
          style={{ left: `${((active! + 0.5) / days.length) * 100}%` }}
        >
          <div className="font-medium">{formatDay(current.day)}</div>
          <div className="text-ink-3">{describe(current)}</div>
        </div>
      ) : null}

      {showLegend ? (
        <div className="mt-2 flex items-center justify-between tabular text-[11px] text-ink-3">
          <span>{days.length} days ago</span>
          <span className="tabular">{formatPercent(overall)} uptime</span>
          <span>Today</span>
        </div>
      ) : null}
    </div>
  );
}
