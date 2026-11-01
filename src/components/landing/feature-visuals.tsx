// src/components/landing/feature-visuals.tsx
"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

/** A 30-day bar strip that fills in when scrolled into view. */
export function BarsVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const bars = Array.from({ length: 30 }, (_, index) => (index === 11 ? "down" : index === 22 || index === 23 ? "degraded" : "up"));
  const color = { up: "bg-up", down: "bg-down", degraded: "bg-degraded" };
  return (
    <div ref={ref} className="flex h-14 items-end gap-[3px]">
      {bars.map((bar, index) => (
        <motion.span
          key={index}
          className={`h-full flex-1 rounded-[2px] ${color[bar as keyof typeof color]}`}
          style={{ transformOrigin: "bottom" }}
          initial={reduce ? false : { scaleY: 0.15, opacity: 0 }}
          animate={inView ? { scaleY: 1, opacity: 1 } : undefined}
          transition={{ delay: index * 0.025, duration: 0.35 }}
        />
      ))}
    </div>
  );
}

/** Check, fail, retry, alert: the incident pipeline as an animated timeline. */
export function PipelineVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const steps = [
    { label: "Check", detail: "GET 503 · 412 ms", tone: "text-down border-down/40 bg-down-soft" },
    { label: "Retry", detail: "1.5 s later · 503", tone: "text-down border-down/40 bg-down-soft" },
    { label: "Incident", detail: "opened · webhook sent", tone: "text-ink border-line-strong bg-surface" },
    { label: "Recovered", detail: "200 · closed after 9 min", tone: "text-up border-up/40 bg-up-soft" },
  ];
  return (
    <div ref={ref} className="grid gap-2">
      {steps.map((step, index) => (
        <motion.div
          key={step.label}
          initial={reduce ? false : { opacity: 0, x: -14 }}
          animate={inView ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: index * 0.22, duration: 0.4 }}
          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[12.5px] ${step.tone}`}
        >
          <span className="font-semibold">{step.label}</span>
          <span className="font-mono text-[11.5px] opacity-80">{step.detail}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** SSL countdown dial. */
export function SslVisual() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const circumference = 2 * Math.PI * 34;
  return (
    <div className="flex items-center gap-4">
      <svg ref={ref} viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--line)" strokeWidth="7" />
        <motion.circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="var(--degraded)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: circumference * (1 - 21 / 90) } : undefined}
          transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <div>
        <div className="text-[28px] font-bold leading-none tracking-[-0.03em] text-degraded tabular">21 days</div>
        <div className="mt-1 text-[12.5px] text-ink-3">until shop.acme.com&apos;s certificate expires</div>
      </div>
    </div>
  );
}

/** Role chips for the teams card. */
export function TeamVisual() {
  const people = [
    { initial: "N", role: "Owner", color: "bg-ink text-paper" },
    { initial: "S", role: "Admin", color: "bg-pen text-white" },
    { initial: "M", role: "Member", color: "bg-up text-white" },
    { initial: "C", role: "Viewer", color: "bg-surface-2 text-ink-2 ring-1 ring-line" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {people.map((person) => (
        <span key={person.role} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[12.5px]">
          <span className={`grid size-6 place-items-center rounded-full font-mono text-[11px] font-semibold ${person.color}`}>{person.initial}</span>
          {person.role}
        </span>
      ))}
    </div>
  );
}
