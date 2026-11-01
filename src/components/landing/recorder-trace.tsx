// src/components/landing/recorder-trace.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

/*
  The signature element: a chart-recorder pen drawing live response times.
  Every so often the site "goes down", the pen drops to the floor in red, and recovers.
*/

const COUNT = 96;
const W = 960;
const H = 240;
const FLOOR = H - 22;

type Sample = { v: number; down: boolean };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeGenerator(seed: number) {
  const rand = seeded(seed);
  let tick = 0;
  let base = 0.42;
  return (): Sample => {
    tick += 1;
    const phase = tick % 120;
    if (phase >= 92 && phase < 102) return { v: 0, down: true };
    base += (rand() - 0.5) * 0.06;
    base = Math.min(0.62, Math.max(0.28, base));
    const spike = rand() > 0.94 ? rand() * 0.3 : 0;
    return { v: Math.min(0.95, base + spike + (rand() - 0.5) * 0.05), down: false };
  };
}

function initialSamples(): Sample[] {
  const next = makeGenerator(7);
  // Skip ahead so the first frame already shows a recovered outage on the left.
  for (let i = 0; i < 20; i++) next();
  return Array.from({ length: COUNT }, () => next());
}

function toY(sample: Sample) {
  return sample.down ? FLOOR : FLOOR - sample.v * (FLOOR - 24);
}

function buildPaths(samples: Sample[], offset: number) {
  const step = W / (COUNT - 1);
  const segments: { d: string; down: boolean }[] = [];
  let current: { d: string; down: boolean } | null = null;
  samples.forEach((sample, index) => {
    const x = index * step - offset * step;
    const y = toY(sample);
    if (!current || current.down !== sample.down) {
      const prev = samples[index - 1];
      const start = prev ? `M${(x - step).toFixed(1)},${toY(prev).toFixed(1)} L` : "M";
      current = { d: `${start}${x.toFixed(1)},${y.toFixed(1)}`, down: sample.down };
      segments.push(current);
    } else {
      current.d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
    }
  });
  return segments;
}

export function RecorderTrace({ className, showReadout = true }: { className?: string; showReadout?: boolean }) {
  const [samples, setSamples] = useState<Sample[]>(initialSamples);
  const [offset, setOffset] = useState(0);
  const generatorRef = useRef<() => Sample>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const generator = makeGenerator(7);
    for (let i = 0; i < 20 + COUNT; i++) generator();
    generatorRef.current = generator;

    let frame = 0;
    let last = performance.now();
    const STEP_MS = 140;
    const loop = (now: number) => {
      const progress = (now - last) / STEP_MS;
      if (progress >= 1) {
        last = now;
        setSamples((prev) => [...prev.slice(1), generatorRef.current!()]);
        setOffset(0);
      } else {
        setOffset(progress);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const segments = buildPaths(samples, offset);
  const head = samples[samples.length - 1];
  const headX = W - offset * (W / (COUNT - 1));
  const headY = toY(head);
  const ms = head.down ? null : Math.round(80 + head.v * 420);

  return (
    <div className={cx("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label="Animated response time trace with a short outage">
        <defs>
          <linearGradient id="trace-fade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.12" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id="trace-mask">
            <rect width={W} height={H} fill="url(#trace-fade)" />
          </mask>
        </defs>

        <line x1="0" x2={W} y1={FLOOR} y2={FLOOR} stroke="var(--ink-3)" strokeOpacity="0.35" strokeDasharray="2 6" />
        <line x1="0" x2={W} y1={FLOOR - 0.62 * (FLOOR - 24)} y2={FLOOR - 0.62 * (FLOOR - 24)} stroke="var(--degraded)" strokeOpacity="0.35" strokeDasharray="6 6" />

        <g mask="url(#trace-mask)">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.d}
              fill="none"
              stroke={segment.down ? "var(--down)" : "var(--pen)"}
              strokeWidth={segment.down ? 3 : 2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* Pen arm and head */}
        <line x1={headX} x2={headX} y1="0" y2={H} stroke="var(--ink)" strokeOpacity="0.14" vectorEffect="non-scaling-stroke" />
        <circle cx={headX} cy={headY} r="5" fill={head.down ? "var(--down)" : "var(--pen)"} />
        <circle cx={headX} cy={headY} r="11" fill={head.down ? "var(--down)" : "var(--pen)"} opacity="0.15" />
      </svg>

      {showReadout ? (
        <div
          className="pointer-events-none absolute right-0 top-0 -translate-y-full pb-2 tabular text-[12px]"
          aria-hidden
        >
          {head.down ? (
            <span className="rounded-full bg-down-soft px-2.5 py-1 font-semibold text-down">DOWN · 503</span>
          ) : (
            <span className="rounded-full bg-surface px-2.5 py-1 text-ink-2 shadow-card ring-1 ring-line">{ms} ms</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
