// src/components/landing/hero-instrument.tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import { RecorderTrace } from "./recorder-trace";

const channels = [
  { name: "acme.com", ms: 118, status: "up" },
  { name: "api.acme.com", ms: 203, status: "up" },
  { name: "billing.acme.com", ms: null, status: "down" },
  { name: "docs.acme.com", ms: 2310, status: "degraded" },
] as const;

const dot = { up: "bg-up", down: "bg-down", degraded: "bg-degraded" };

export function HeroInstrument() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 30, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      style={{ transformPerspective: 1200 }}
      className="relative rounded-[18px] border border-line-strong bg-surface p-2 shadow-pop"
    >
      <div className="rounded-[12px] border border-line bg-surface-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-block size-2 rounded-full bg-up text-up status-ping" aria-hidden />
            <span className="text-[13.5px] font-semibold">api.acme.com</span>
            <span className="hidden font-mono text-[11.5px] text-ink-3 sm:inline">GET · every 5 min · from 1 region</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[12px] text-ink-2 tabular">
            <span>
              <span className="text-ink-3">30d </span>99.94%
            </span>
            <span className="hidden sm:inline">
              <span className="text-ink-3">p95 </span>412 ms
            </span>
          </div>
        </div>

        <div className="graph-paper relative px-3 pb-3 pt-12 sm:px-5">
          <RecorderTrace className="h-[180px] w-full sm:h-[230px]" />
        </div>

        <div className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {channels.map((channel, index) => (
            <motion.div
              key={channel.name}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.08, duration: 0.4 }}
              className="flex items-center justify-between gap-2 border-line px-4 py-3 [&:nth-child(2n)]:border-l sm:[&:not(:first-child)]:border-l"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={`size-1.5 shrink-0 rounded-full ${dot[channel.status]}`} aria-hidden />
                <span className="truncate font-mono text-[11.5px] text-ink-2">{channel.name}</span>
              </span>
              <span
                className={`font-mono text-[11.5px] font-semibold tabular ${channel.status === "down" ? "text-down" : channel.status === "degraded" ? "text-degraded" : "text-ink"}`}
              >
                {channel.ms === null ? "503" : `${channel.ms}ms`}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Floating alert card, the moment SiteWatch earns its keep */}
      <motion.div
        initial={reduce ? false : { opacity: 0, x: 24, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
        className="absolute left-0 top-[46%] hidden w-[290px] -translate-x-8 rounded-[12px] border border-line bg-surface p-3.5 shadow-pop sm:block lg:-translate-x-14"
      >
        <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
          <span className="grid size-5 place-items-center rounded bg-[#4a154b] font-mono text-[10px] font-bold text-white">#</span>
          ops-alerts · now
        </div>
        <p className="mt-2 text-[13px] leading-snug">
          <span className="font-semibold text-down">🔴 billing.acme.com is DOWN</span>
          <br />
          <span className="text-ink-2">Expected 2xx, got 503. Retried once.</span>
        </p>
      </motion.div>
    </motion.div>
  );
}
